
FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

# Install all language toolchains and essential utilities
RUN apt-get update && apt-get install -y --no-install-recommends \
    openjdk-21-jdk-headless \
    python3.12 \
    python3.12-venv \
    python3-pip \
    gcc \
    g++ \
    make \
    bash \
    coreutils \
    time \
    findutils \
    diffutils \
    jq \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Set a consistent working directory
WORKDIR /workspace

# Verify installed toolchains and utilities
RUN java -version && \
    javac -version && \
    python3.12 --version && \
    gcc --version && \
    g++ --version && \
    command -v timeout && \
    test -x /usr/bin/time && \
    /usr/bin/time --version
