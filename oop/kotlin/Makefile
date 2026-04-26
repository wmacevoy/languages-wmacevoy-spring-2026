KOTLINC      ?= kotlinc
JAR           = games.jar
DOCKER_IMAGE  = oop-kotlin

.PHONY: all run clean docker-build docker-test

all: $(JAR)

$(JAR): src/*.kt
	$(KOTLINC) src/*.kt -include-runtime -d $(JAR)

run: $(JAR)
	java -jar $(JAR)

clean:
	rm -f $(JAR)

docker-build:
	docker build -t $(DOCKER_IMAGE) .

docker-test: docker-build
	docker run --rm $(DOCKER_IMAGE)
