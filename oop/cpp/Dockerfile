# Multi-stage: build with gcc, run on slim debian.
# Static-link libstdc++/libgcc so the binary doesn't depend on the build
# image's newer C++ runtime.
FROM gcc:13 AS build
WORKDIR /app
COPY src/ src/
RUN g++ -std=c++17 -O2 -Wall -Wextra \
        -static-libstdc++ -static-libgcc \
        src/main.cpp -o games

FROM debian:bookworm-slim
WORKDIR /app
COPY --from=build /app/games /app/games
CMD ["/app/games"]
