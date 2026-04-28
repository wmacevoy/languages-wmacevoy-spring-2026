# Top-level orchestration: build/test all four language implementations
# inside Docker containers so we don't need any toolchain installed locally.
#
# Targets:
#   make docker-test          -- build + run all four containers (sequential)
#   make docker-test-cpp      -- C++ only
#   make docker-test-rust     -- Rust only
#   make docker-test-python   -- Python only
#   make docker-test-kotlin   -- Kotlin only
#   make docker-build         -- just build all four images
#   make docker-clean         -- remove the local images
#
# Each per-language container runs the games driver. A container exits 0
# only if the games ran to completion without an unhandled error, so a
# successful `docker run` *is* the test.

.PHONY: docker-test docker-build docker-clean \
        docker-test-cpp docker-test-rust docker-test-python docker-test-kotlin \
        docker-build-cpp docker-build-rust docker-build-python docker-build-kotlin \
        bench bench-build bench-clean

docker-test: docker-test-cpp docker-test-rust docker-test-python docker-test-kotlin
	@echo ""
	@echo "===== All four language containers ran to completion ====="

docker-build: docker-build-cpp docker-build-rust docker-build-python docker-build-kotlin

docker-test-cpp:
	@echo ""
	@echo "===== C++ ====="
	@$(MAKE) -C cpp docker-test

docker-test-rust:
	@echo ""
	@echo "===== Rust ====="
	@$(MAKE) -C rust docker-test

docker-test-python:
	@echo ""
	@echo "===== Python ====="
	@$(MAKE) -C python docker-test

docker-test-kotlin:
	@echo ""
	@echo "===== Kotlin ====="
	@$(MAKE) -C kotlin docker-test

docker-build-cpp:
	@$(MAKE) -C cpp docker-build

docker-build-rust:
	@$(MAKE) -C rust docker-build

docker-build-python:
	@$(MAKE) -C python docker-build

docker-build-kotlin:
	@$(MAKE) -C kotlin docker-build

docker-clean:
	-docker rmi oop-cpp oop-rust oop-python oop-kotlin 2>/dev/null || true

# Comparative benchmark: builds 6 C++ variants (gcc/clang × O0-g/O2/O3),
# 2 Rust variants (debug/release), Kotlin, and runs Python under both
# CPython and PyPy. Times each at --repeat 1 and --repeat N to separate
# startup from per-iteration cost; reports artifact size + max RSS too.
#
# Output is a markdown table on stdout.
bench: bench-build
	@docker run --rm oop-bench

bench-build:
	docker build -t oop-bench -f bench/Dockerfile .

bench-clean:
	-docker rmi oop-bench 2>/dev/null || true
