# Multi-stage: build with rust image, run on slim debian.
FROM rust:1.75-slim AS build
WORKDIR /app
COPY Cargo.toml .
COPY src/ src/
RUN cargo build --release

FROM debian:bookworm-slim
WORKDIR /app
COPY --from=build /app/target/release/games /app/games
CMD ["/app/games"]
