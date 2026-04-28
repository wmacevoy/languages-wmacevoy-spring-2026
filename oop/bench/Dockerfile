# Multi-toolchain image for the comparative benchmark.
#
# Build context: the parent `oop/` directory.
# Build everything once; the CMD runs the benchmark harness which times
# each variant and prints a markdown comparison table.

FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

# All toolchains in one apt layer.
RUN apt-get update && apt-get install -y --no-install-recommends \
        g++ \
        clang \
        make \
        python3 \
        pypy3 \
        openjdk-21-jre-headless \
        curl \
        ca-certificates \
        unzip \
        time \
    && rm -rf /var/lib/apt/lists/*

# Rust via rustup (minimal profile keeps the layer small).
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \
        | sh -s -- -y --default-toolchain stable --profile minimal
ENV PATH="/root/.cargo/bin:${PATH}"

# Kotlin compiler from the official JetBrains release.
ARG KOTLIN_VERSION=1.9.22
RUN curl -sSL -o /tmp/kotlin.zip \
        https://github.com/JetBrains/kotlin/releases/download/v${KOTLIN_VERSION}/kotlin-compiler-${KOTLIN_VERSION}.zip \
    && unzip -q /tmp/kotlin.zip -d /opt \
    && rm /tmp/kotlin.zip
ENV PATH="/opt/kotlinc/bin:${PATH}"

WORKDIR /work
COPY cpp     /work/cpp
COPY rust    /work/rust
COPY python  /work/python
COPY kotlin  /work/kotlin
COPY bench/run_bench.py /work/run_bench.py

RUN mkdir -p /work/bin /work/build_times

# ---- C++ : 6 variants (gcc/clang × O0-g/O2/O3) ------------------------
RUN /usr/bin/time -f "%e" -o /work/build_times/cpp-gcc-O0g.t \
        g++ -std=c++17 -O0 -g -Wall -Wextra cpp/src/main.cpp -o /work/bin/cpp-gcc-O0g
RUN /usr/bin/time -f "%e" -o /work/build_times/cpp-gcc-O2.t \
        g++ -std=c++17 -O2 -Wall -Wextra cpp/src/main.cpp -o /work/bin/cpp-gcc-O2
RUN /usr/bin/time -f "%e" -o /work/build_times/cpp-gcc-O3.t \
        g++ -std=c++17 -O3 -Wall -Wextra cpp/src/main.cpp -o /work/bin/cpp-gcc-O3
RUN /usr/bin/time -f "%e" -o /work/build_times/cpp-clang-O0g.t \
        clang++ -std=c++17 -O0 -g -Wall -Wextra cpp/src/main.cpp -o /work/bin/cpp-clang-O0g
RUN /usr/bin/time -f "%e" -o /work/build_times/cpp-clang-O2.t \
        clang++ -std=c++17 -O2 -Wall -Wextra cpp/src/main.cpp -o /work/bin/cpp-clang-O2
RUN /usr/bin/time -f "%e" -o /work/build_times/cpp-clang-O3.t \
        clang++ -std=c++17 -O3 -Wall -Wextra cpp/src/main.cpp -o /work/bin/cpp-clang-O3

# ---- Rust : debug + release ------------------------------------------
RUN cd /work/rust \
    && /usr/bin/time -f "%e" -o /work/build_times/rust-debug.t cargo build \
    && cp target/debug/games /work/bin/rust-debug \
    && /usr/bin/time -f "%e" -o /work/build_times/rust-release.t cargo build --release \
    && cp target/release/games /work/bin/rust-release

# ---- Kotlin (JVM bytecode + bundled runtime in a fat jar) ------------
RUN cd /work/kotlin \
    && /usr/bin/time -f "%e" -o /work/build_times/kotlin.t \
        kotlinc src/*.kt -include-runtime -d /work/bin/kotlin-games.jar

# ---- Python / PyPy (no compile step) ---------------------------------
RUN echo 0 > /work/build_times/python-cpython.t \
    && echo 0 > /work/build_times/python-pypy.t

CMD ["python3", "/work/run_bench.py"]
