CXX      ?= c++
CXXFLAGS ?= -std=c++17 -Wall -Wextra -O2

BIN          = games
DOCKER_IMAGE = oop-cpp

.PHONY: all clean run docker-build docker-test

all: $(BIN)

$(BIN): src/main.cpp src/*.h
	$(CXX) $(CXXFLAGS) src/main.cpp -o $(BIN)

run: $(BIN)
	./$(BIN)

clean:
	rm -f $(BIN)

docker-build:
	docker build -t $(DOCKER_IMAGE) .

docker-test: docker-build
	docker run --rm $(DOCKER_IMAGE)
