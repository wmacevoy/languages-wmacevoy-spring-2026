# Kotlin doesn't have a widely-blessed official Docker image. We install
# the compiler manually from the JetBrains GitHub release in the build
# stage, then run the resulting fat jar on a slim JRE.
FROM eclipse-temurin:21-jdk AS build
ARG KOTLIN_VERSION=1.9.22
RUN apt-get update && apt-get install -y --no-install-recommends unzip curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
RUN curl -sSL -o /tmp/kotlin.zip \
    https://github.com/JetBrains/kotlin/releases/download/v${KOTLIN_VERSION}/kotlin-compiler-${KOTLIN_VERSION}.zip \
    && unzip -q /tmp/kotlin.zip -d /opt \
    && rm /tmp/kotlin.zip
ENV PATH=/opt/kotlinc/bin:$PATH

WORKDIR /app
COPY src/ src/
RUN kotlinc src/*.kt -include-runtime -d games.jar

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/games.jar /app/games.jar
CMD ["java", "-jar", "/app/games.jar"]
