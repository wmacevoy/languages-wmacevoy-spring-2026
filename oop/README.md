# OOP Across Four Languages

A small turn-based game engine implemented in **C++**, **Rust**, **Python**, and **Kotlin**, with three concrete games — **Tic-Tac-Toe**, **Connect Four**, and **Nim**. The same OO design appears in every language so you can read the code side-by-side and see how each language pushes you toward different idioms.

## The shared design

Every implementation has the same six pieces:

| Piece | Role |
|---|---|
| `Side` | Identifies which of the two players is to move (`ONE` / `TWO`). |
| `Game` | Abstract contract: legal moves, apply move, current side, is over, winner, render. |
| `Player` | Strategy: given a `Game`, return a move. |
| `RandomPlayer` | One concrete strategy — picks a legal move uniformly at random. |
| `TicTacToe`, `ConnectFour`, `Nim` | Concrete `Game` implementations. |
| `runGame` | The engine loop: alternates strategies until the game is over. |

The Move type differs per game. `runGame` doesn't care; it asks the game for legal moves and hands one to whichever strategy is on turn.

```
  ┌──────────────┐ chooseMove(Game) ┌───────────────┐
  │  Player<M>   ├─────────────────▶│   Game<M>     │
  │ (strategy)   │◀─────────────────┤  (rules+state)│
  └──────────────┘   returns M      └───────────────┘
            ▲                                ▲
            │ implements                     │ implements
   ┌────────┴───────┐              ┌─────────┴────────┐
   │ RandomPlayer   │              │ TicTacToe        │
   │ (your AI here) │              │ ConnectFour      │
   └────────────────┘              │ Nim              │
                                   └──────────────────┘
```

Why three games? Tic-Tac-Toe and Connect Four are both 2D-grid games, and a sloppy abstraction would bake the grid into the base class. **Nim breaks that assumption** — its state is a list of pile sizes, not a board — so if Nim plugs in cleanly, the abstraction is honest.

## Running each version

### Native (needs the language's toolchain installed)

| Language | From `oop/<lang>/` | Toolchain |
|---|---|---|
| C++   | `make run`              | `c++` with `-std=c++17` |
| Rust  | `cargo run`             | Rust 2021 edition |
| Python| `python3 main.py`       | Python 3.9+ |
| Kotlin| `make run`              | `kotlinc` + `java` |

### In Docker (no toolchain needed locally — only Docker)

From `oop/`:

```sh
make docker-test         # build + run all four containers
make docker-test-cpp     # one language at a time
make docker-test-rust
make docker-test-python
make docker-test-kotlin
make docker-clean        # remove the local images
```

Each container builds the games from source and runs the driver. A successful container exit (code 0) is the test — if any game crashes or fails to compile, the run fails. All four were verified to pass end-to-end via `make docker-test`.

The four `Dockerfile`s (one per language) are short and worth a glance — they show the build/run dichotomy each language enforces:

- **C++** and **Rust** use multi-stage builds: a heavy build image, then copy a single binary onto `debian:bookworm-slim`. (The C++ binary statically links libstdc++ to avoid runtime/build version skew.)
- **Python** is single-stage on `python:3.12-slim` — no compile step, the source ships.
- **Kotlin** downloads the compiler from JetBrains' GitHub release (no widely-blessed official Kotlin image), compiles to a fat jar, then runs on `eclipse-temurin:21-jre`.

## How each language expresses the same idea

### 1. The Game contract

| Language | Mechanism | Move type binding |
|---|---|---|
| **C++** | `template<typename MoveT> class Game` with `virtual` methods | template parameter |
| **Rust** | `trait Game { type Move; ... }` | associated type |
| **Python** | `class Game(ABC)` with `@abstractmethod` | not declared — duck typing |
| **Kotlin** | `interface Game<M>` | generic parameter |

Notice the spread: C++ glues compile-time generics (`template`) to runtime polymorphism (`virtual`) in one declaration. Rust separates the two more cleanly — a `trait` is the contract, and you opt into runtime polymorphism only by writing `dyn Trait`. Python skips static enforcement entirely; ABC is documentation-with-teeth, not a type. Kotlin's `interface<M>` is the most Java-shaped of the four.

### 2. Inheritance vs. trait/interface implementation

```cpp
// C++
class TicTacToe : public Game<TicTacToeMove> { ... };
```
```rust
// Rust
impl Game for TicTacToe { type Move = TicTacToeMove; ... }
```
```python
# Python
class TicTacToe(Game): ...
```
```kotlin
// Kotlin
class TicTacToe : Game<TicTacToeMove> { ... }
```

C++, Python, and Kotlin all use the syntactic colon-or-extends form — these are **inheritance**. Rust's `impl Game for TicTacToe` is **not** inheritance: there is no base-class data, no `super`, no parent destructor running. It's "TicTacToe satisfies the Game interface." This shows up most when you try to share state between concrete games — in the OO languages you'd put it in a base class; in Rust you compose (a helper struct or free function).

### 3. "Maybe a winner" — null safety

| Language | Type |
|---|---|
| C++   | `std::optional<Side>` |
| Rust  | `Option<Side>` |
| Python| `Optional[Side]` (i.e. `Side | None`) |
| Kotlin| `Side?` |

All four make absence first-class. The interesting contrast is what happens when you forget to handle it:

- **Rust** and **Kotlin** refuse to compile.
- **C++** lets you call `*opt` on an empty `optional` — undefined behavior at runtime.
- **Python** lets you reach for `.label` on `None` and raises `AttributeError`.

So even though all four "have an Optional," only two enforce that you actually deal with it.

### 4. Strategy (the Player)

Each `RandomPlayer` is the Strategy pattern, but the level of ceremony varies:

```cpp
// C++: class template, virtual override, member RNG.
template <typename MoveT>
class RandomPlayer : public Player<MoveT> {
    std::mt19937 rng_;
    MoveT chooseMove(const Game<MoveT>& g) override { ... }
};
```
```rust
// Rust: a struct with an impl block. The "for any M: Clone" is explicit.
impl<M: Clone> Player<M> for RandomPlayer { ... }
```
```python
# Python: just a class. No types required.
class RandomPlayer(Player):
    def choose_move(self, game): ...
```
```kotlin
// Kotlin: primary constructor in the header, no body needed for fields.
class RandomPlayer<M>(seed: Long, override val name: String) : Player<M> { ... }
```

Python is the shortest because Python doesn't ask you to prove anything to the type checker. Kotlin is shortest among the *typed* languages because data lives in the constructor header. C++ is wordiest because you spell out the template, the virtual override, the access specifier, and the destructor virtuality on the base.

### 5. Value types for moves

| Language | What we used | Auto-generated |
|---|---|---|
| C++   | `struct TicTacToeMove { int row, col; };` | nothing — write `==` yourself |
| Rust  | `#[derive(Clone, Copy, Debug)] struct ...` | Clone, Copy, Debug for free |
| Python| `@dataclass(frozen=True) class ...` | `__init__`, `__eq__`, `__hash__`, `__repr__` |
| Kotlin| `data class TicTacToeMove(...)` | `equals`, `hashCode`, `toString`, `copy` |

Rust, Python, and Kotlin all give you "value type" in one decorator/keyword. C++ doesn't — you have to opt in with `<=>` (C++20) or hand-write operators. Among the four, **Kotlin's `data class` and Python's `@dataclass` are the closest siblings**.

### 6. Enums

C++'s `enum class Side { One, Two }` is just a tagged integer. The other three have *richer* enums:

- **Rust**: `enum Side { One, Two }` with `impl Side { fn other(self) -> Side ... }` — methods on enums via `impl` blocks.
- **Python**: `class Side(Enum)` — full class with methods and properties.
- **Kotlin**: `enum class Side(val label: String) { ONE("Player 1"), TWO("Player 2"); fun other() = ... }` — fields *and* methods *per variant*.

In each non-C++ language, `Side.other()` lives on the type. In C++, it's a free function `other(Side)`.

### 7. The engine loop

In all four languages, the engine is a free function (or top-level). It takes the game and a pair of players, alternates them, prints state, and returns the winner. The shape is identical:

```
while not game.is_over():
    side = game.current_side()
    move = players[side].choose_move(game)
    game.apply_move(move)
return game.winner()
```

The differences are in the **type signatures** that get you there:

- **C++**: `template<typename MoveT> std::optional<Side> runGame(Game<MoveT>&, std::array<Player<MoveT>*, 2>, bool);`
- **Rust**: `fn run_game<G: Game>(game: &mut G, players: [&mut dyn Player<G::Move>; 2], verbose: bool) -> Option<Side>`
- **Python**: `def run_game(game, players, verbose=True): ...`
- **Kotlin**: `fun <M> runGame(game: Game<M>, players: Pair<Player<M>, Player<M>>, verbose: Boolean = true): Side?`

Rust's signature is the most informative — it makes the trait-object boundary (`dyn Player<G::Move>`) visible. Python's is the most readable but tells you nothing. C++ and Kotlin sit in the middle.

## Pedagogical takeaways

1. **All four languages express the same OO design** — abstract contract, concrete subclasses, strategy injection, free engine function. The conceptual model travels.

2. **They disagree on inheritance.** C++/Python/Kotlin let you literally inherit from `Game`. Rust does not — you implement a trait, and shared base-class state has to be handled by composition.

3. **They disagree on what "the type system enforces."** Python lets you do anything; Rust forces you to handle nullability and ownership; C++ trusts you to be careful; Kotlin enforces null-safety but lets the JVM type-erase generics underneath.

4. **They agree on null.** All four spell "no winner yet" with an Option-shaped type. This is one of the cleaner cross-language convergences in modern programming.

5. **Boilerplate per concept varies a lot.** A move type costs ~1 line in Rust/Python/Kotlin but ~3 in C++ (and more if you want equality). A strategy class costs ~5 lines in Python/Kotlin and ~10 in C++/Rust.

If you read only one file in each language to feel the contrast, read the `Game` declaration and the `runGame` function — those carry the language's signature most clearly.

## Comparative benchmark

`make bench` builds eleven variants inside a single multi-toolchain Docker image — **gcc/clang × `-O0 -g` / `-O2` / `-O3`**, **Rust debug + release**, **Kotlin**, **CPython**, **PyPy** — and times the Optimal-vs-Optimal search workload (TTT + Nim(3,4,5) + ConnectFour 4×4 need-3) at `--repeat 1` and `--repeat 20`. Differencing those two wall-times separates **process startup** (intercept) from **per-iteration search cost** (slope). The harness also reports build time, deliverable size, and peak resident memory.

Sample run on `aarch64` Linux (Docker on Apple Silicon):

| Variant | Build | Artifact | Startup | Per-iter | × fastest | Max RSS | Notes |
|---|---:|---:|---:|---:|---:|---:|---|
| `cpp-gcc-O0g` | 0.41 s | 818 KiB | 2.4 ms | 56.4 ms | 7.3× | 4.7 MiB | Debug iterators + no inlining + spilled regs — the slow native floor.[¹](#footnote-O0) |
| `cpp-gcc-O2` | 0.75 s | 85 KiB | 0.8 ms | 12.9 ms | 1.7× | 4.7 MiB | Production default; almost everything `-O3` gets at half the build time. |
| `cpp-gcc-O3` | 1.05 s | 150 KiB | 0.6 ms | 12.7 ms | 1.6× | 4.7 MiB | Extra inlining + auto-vec; marginal win on a recursive search. |
| `cpp-clang-O0g` | 0.38 s | 689 KiB | 0.9 ms | 56.3 ms | 7.3× | 4.7 MiB | Same story as gcc `-O0`; optimisation level dominates compiler choice. |
| `cpp-clang-O2` | 0.53 s | 87 KiB | 1.0 ms | 11.3 ms | 1.5× | 4.6 MiB | ~10% ahead of gcc here; LLVM inliner crosses virtual calls well. |
| `cpp-clang-O3` | 0.57 s | 87 KiB | 0.5 ms | 11.0 ms | 1.4× | 4.7 MiB | Fastest C++ row. Devirtualises through the template+virtual mix. |
| `rust-debug` | 0.17 s | 4954 KiB | 0.5 ms | 93.0 ms | 12.0× | 2.8 MiB | 12× release: bounds checks live, no inlining, no devirt. Don't ship this. |
| `rust-release` | 0.15 s | 543 KiB | 0.7 ms | 7.7 ms | 1.0× | 2.8 MiB | Fastest overall. Tight `HashMap`; trait dispatch fully monomorphised. |
| `kotlin` | 3.11 s | 4866 KiB | 97.7 ms | 18.9 ms | 2.4× | 179.5 MiB | JVM tax is memory + startup, not steady-state. Warmed JIT closes the gap. |
| `python-cpython` | n/a | 18 KiB | 18.9 ms | 308.6 ms | 39.9× | 18.1 MiB | Bytecode interpreter — every CPython op pays a dispatch tax. |
| `python-pypy` | n/a | 18 KiB | 332.0 ms | 81.6 ms | 10.6× | 69.4 MiB | Same source, 4× faster. The JIT is the entire difference. |

A few cross-cutting things worth surfacing in class:

- **Optimisation level is the biggest single knob.** `-O0 -g` → `-O3` is a 5× speedup on identical C++ source; Rust debug → release is 12×. That swamps almost every cross-language gap. "C++ is fast" is a half-truth — *optimised* C++ is fast.
- **Compiler choice within a language is small.** clang `-O3` beats gcc `-O3` by ~16% here; at `-O2` the gap nearly closes.
- **Rust release narrowly beats clang `-O3`** (7.7 ms vs 11.0 ms). "Rust gives up nothing for safety" is empirically defensible on this code.
- **JVM tax is memory + startup, not throughput.** Warmed Kotlin is only 2.4× the Rust baseline — but uses **~60× the RAM** and **~140× the startup time**.
- **PyPy makes Python a different language.** Same source, 4× faster. The JIT is the entire difference.
- **Memory tells a different story than time.** Native processes here are 3-5 MiB; CPython ~18 MiB; PyPy ~70 MiB; JVM ~180 MiB. The hot loop's data is identical.
- **Build time has its own personality.** Rust incremental release is the fastest of any toolchain (0.15 s); kotlinc is the slowest (3.1 s) because it pays a JVM startup itself.

<a id="footnote-O0"></a>**¹ Why `-O0 -g` is so slow, beyond "no inlining":** debug-mode STL iterators run bounds and validity checks on every dereference; every local variable lives on the stack instead of in a register; function calls are real `call` instructions with full prologues/epilogues; there's no devirtualisation, so every `virtual` call goes through the vtable; and the unwinding tables for `-g` bloat the binary. Recursive game-tree search amplifies all of these — the inner loop is dominated by what the compiler *didn't* do.

## Further reading

[`philosophy.md`](philosophy.md) — a short essay on where OO stands in modern software (object-shards, lazy flyweights, dispatch as the part worth keeping) and what's worth telling a student about it.
