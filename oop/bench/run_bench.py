#!/usr/bin/env python3
"""Comparative benchmark harness.

For each language/optimization variant: time `--bench --repeat 1` and
`--bench --repeat N` under /usr/bin/time -v. Differencing separates
process startup cost from per-iteration search cost. Also captures
peak resident-set memory (max RSS) and the size of the deliverable.

Print a markdown table to stdout.

The variants and their commands are listed in VARIANTS below — each
entry is independent, so adding/removing a row is local.
"""

from __future__ import annotations

import os
import re
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path

REPEAT_N = 20        # iterations for the "many" run; differencing yields per-iter
WORK = Path("/work")


@dataclass
class Variant:
    label: str
    cmd: list[str]            # invocation prefix (without --bench / --repeat)
    artifact: Path            # the file we report a "size" for
    build_time_s: float       # seconds spent producing `artifact`
    notes: str = ""           # one-line teaching note for the printed table


def read_build_time(name: str) -> float:
    p = WORK / "build_times" / f"{name}.t"
    try:
        return float(p.read_text().strip())
    except Exception:
        return float("nan")


def variant_list() -> list[Variant]:
    bin_ = WORK / "bin"
    py_main = WORK / "python" / "main.py"
    py_total = sum(p.stat().st_size for p in (WORK / "python").glob("*.py"))

    notes = {
        "cpp-gcc-O0g":   "Debug iterators + no inlining + spilled regs — the slow native floor.",
        "cpp-gcc-O2":    "Production default; almost everything -O3 gets at half the build time.",
        "cpp-gcc-O3":    "Extra inlining + auto-vec; marginal win on a recursive search.",
        "cpp-clang-O0g": "Same story as gcc -O0; optimisation level dominates compiler choice.",
        "cpp-clang-O2": "~10% ahead of gcc here; LLVM inliner crosses virtual calls well.",
        "cpp-clang-O3": "Fastest C++ row. Devirtualises through the template+virtual mix.",
        "rust-debug":   "12× release: bounds checks live, no inlining, no devirt. Don't ship this.",
        "rust-release": "Fastest overall. Tight HashMap; trait dispatch fully monomorphised.",
        "kotlin":       "JVM tax is memory + startup, not steady-state. Warmed JIT closes the gap.",
        "python-cpython": "Bytecode interpreter — every CPython op pays a dispatch tax.",
        "python-pypy":    "Same source, 4× faster. The JIT is the entire difference.",
    }

    out: list[Variant] = []

    for label in [
        "cpp-gcc-O0g", "cpp-gcc-O2", "cpp-gcc-O3",
        "cpp-clang-O0g", "cpp-clang-O2", "cpp-clang-O3",
        "rust-debug", "rust-release",
    ]:
        out.append(Variant(
            label=label,
            cmd=[str(bin_ / label)],
            artifact=bin_ / label,
            build_time_s=read_build_time(label),
            notes=notes[label],
        ))

    out.append(Variant(
        label="kotlin",
        cmd=["java", "-jar", str(bin_ / "kotlin-games.jar")],
        artifact=bin_ / "kotlin-games.jar",
        build_time_s=read_build_time("kotlin"),
        notes=notes["kotlin"],
    ))

    # For Python/PyPy "artifact size" = total .py source bytes the program
    # actually ships; the interpreter is a shared system dependency.
    out.append(Variant(
        label="python-cpython",
        cmd=["python3", str(py_main)],
        artifact=WORK / "python",
        build_time_s=0.0,
        notes=notes["python-cpython"],
    ))
    out.append(Variant(
        label="python-pypy",
        cmd=["pypy3", str(py_main)],
        artifact=WORK / "python",
        build_time_s=0.0,
        notes=notes["python-pypy"],
    ))
    out[-2].__dict__["_size_override"] = py_total
    out[-1].__dict__["_size_override"] = py_total

    return out


# -----------------------------------------------------------------
# Measurement.
#
# We use two timing sources:
#   - time.perf_counter() in this Python harness, around subprocess.run.
#     Gives microsecond resolution — enough to resolve native-binary
#     startup costs (~1-3 ms) which /usr/bin/time -v rounds away.
#   - /usr/bin/time -v wraps the child only to capture Maximum Resident
#     Set Size (peak memory), which the harness can't observe directly.
#
# Output goes to /dev/null so timing captures pure work + I/O syscalls,
# not terminal rendering.
# -----------------------------------------------------------------

_TIME_RE_RSS = re.compile(r"Maximum resident set size \(kbytes\):\s*(\d+)")


def time_run(cmd: list[str], repeat: int) -> tuple[float, int]:
    """Returns (wall_seconds, max_rss_kb).

    wall_seconds is the harness-side perf_counter measurement of the full
    fork/exec/run/exit cycle; max_rss_kb is parsed out of /usr/bin/time -v's
    captured stderr.
    """
    full = ["/usr/bin/time", "-v"] + cmd + ["--bench", "--repeat", str(repeat)]
    t0 = time.perf_counter()
    proc = subprocess.run(full, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    wall = time.perf_counter() - t0
    if proc.returncode != 0:
        raise RuntimeError(f"command failed: {' '.join(full)}\n{proc.stderr.decode()}")
    rss = None
    for line in proc.stderr.decode().splitlines():
        m = _TIME_RE_RSS.search(line)
        if m: rss = int(m.group(1))
    if rss is None:
        raise RuntimeError(f"could not parse /usr/bin/time RSS:\n{proc.stderr.decode()}")
    return wall, rss


def measure(v: Variant) -> dict:
    # One warmup --repeat 1 invocation per variant: pulls files into the
    # page cache so the timed runs aren't penalised by cold-cache disk I/O.
    time_run(v.cmd, 1)

    t1, rss1 = time_run(v.cmd, 1)
    tN, rssN = time_run(v.cmd, REPEAT_N)
    per_iter = (tN - t1) / (REPEAT_N - 1)
    startup  = t1 - per_iter
    rss_kb = max(rss1, rssN)
    return {
        "t1_s": t1,
        "tN_s": tN,
        "startup_s": max(startup, 0.0),
        "per_iter_s": max(per_iter, 0.0),
        "rss_kb": rss_kb,
    }


# -----------------------------------------------------------------
# Print
# -----------------------------------------------------------------

def fmt_size(n: int) -> str:
    if n < 10_000:        return f"{n} B"
    if n < 10_000_000:    return f"{n//1024} KiB"
    return f"{n//1024//1024} MiB"


def fmt_secs(s: float) -> str:
    if s < 0.001:    return f"{s*1e6:.0f} μs"
    if s < 1:        return f"{s*1e3:.1f} ms"
    return f"{s:.2f} s"


def uname_m() -> str:
    return subprocess.run(["uname", "-m"], capture_output=True, text=True).stdout.strip()


def main() -> int:
    print(f"Bench harness: --repeat 1 vs --repeat {REPEAT_N} on the Optimal-vs-Optimal suite")
    print(f"Workload per iteration: TTT + Nim(3,4,5) + ConnectFour 4x4 need-3")
    print(f"Container: {uname_m()} on Linux. Per-iter is the slope of "
          f"wall-time-vs-repeat; startup is the intercept.\n")

    variants = variant_list()
    rows = []
    for v in variants:
        try:
            m = measure(v)
        except Exception as e:
            print(f"[!] {v.label}: {e}", file=sys.stderr)
            continue
        size = v.__dict__.get("_size_override")
        if size is None:
            size = v.artifact.stat().st_size
        rows.append((v, m, size))

    # Use the fastest per-iter row as the reference for the speedup column.
    fastest = min(r[1]["per_iter_s"] for r in rows if r[1]["per_iter_s"] > 0)

    print("| Variant | Build | Artifact | Startup | Per-iter | × fastest | Max RSS | Notes |")
    print("|---|---:|---:|---:|---:|---:|---:|---|")
    for v, m, size in rows:
        bt = "n/a" if v.build_time_s == 0 else f"{v.build_time_s:.2f} s"
        ratio = m["per_iter_s"] / fastest if fastest > 0 else float("nan")
        print(f"| `{v.label}` | {bt} | {fmt_size(size)} | "
              f"{fmt_secs(m['startup_s'])} | {fmt_secs(m['per_iter_s'])} | "
              f"{ratio:.1f}× | {m['rss_kb']/1024:.1f} MiB | {v.notes} |")

    return 0


if __name__ == "__main__":
    sys.exit(main())
