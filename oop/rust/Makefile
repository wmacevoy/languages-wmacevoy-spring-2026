DOCKER_IMAGE = oop-rust

.PHONY: build run clean docker-build docker-test

build:
	cargo build --release

run:
	cargo run --release

clean:
	cargo clean

docker-build:
	docker build -t $(DOCKER_IMAGE) .

docker-test: docker-build
	docker run --rm $(DOCKER_IMAGE)
