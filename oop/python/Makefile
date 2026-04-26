DOCKER_IMAGE = oop-python

.PHONY: run docker-build docker-test

run:
	python3 main.py

docker-build:
	docker build -t $(DOCKER_IMAGE) .

docker-test: docker-build
	docker run --rm $(DOCKER_IMAGE)
