# syntax=docker/dockerfile:1.7
#
# Builder image for the @fluffylabs/as-lan SDK, compatible with jammin.
# Two-stage: stage 1 compiles wasm-pvm-cli from crates.io, stage 2 is a
# minimal node:22-slim runtime carrying only the resulting binary.

# ---- Stage 1: build wasm-pvm ---------------------------------------------
# Pinned to bookworm so the resulting binary's glibc requirements match the
# runtime stage (node:22-slim, also bookworm). Unpinned `rust:1-slim` tracks
# the current stable, which may drift to a newer Debian with a higher glibc
# and produce binaries that fail at runtime with `GLIBC_X.Y not found`.
FROM rust:1-slim-bookworm AS builder

# wasm-pvm-cli needs llvm-18 headers + libpolly at compile time.
# llvm-18 is not in Debian bookworm main, but is in bookworm-backports.
RUN set -eux; \
    echo 'deb http://deb.debian.org/debian bookworm-backports main' \
        > /etc/apt/sources.list.d/backports.list; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
        ca-certificates \
        build-essential \
        pkg-config \
        zlib1g-dev \
        libzstd-dev; \
    apt-get install -y --no-install-recommends -t bookworm-backports \
        llvm-18-dev \
        libpolly-18-dev; \
    rm -rf /var/lib/apt/lists/*

# Pin to 0.8.0 with --locked for reproducible builds.
# $CARGO_HOME is /usr/local/cargo in the official rust image, so the
# resulting binary lands at /usr/local/cargo/bin/wasm-pvm.
RUN cargo install wasm-pvm-cli@0.8.0 --locked

# ---- Stage 2: runtime ----------------------------------------------------
FROM node:22-slim AS runtime

# ca-certificates: npm registry TLS. git: npm deps pointing at git URLs.
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
        ca-certificates \
        git; \
    rm -rf /var/lib/apt/lists/*

COPY --from=builder /usr/local/cargo/bin/wasm-pvm /usr/local/bin/wasm-pvm

WORKDIR /app

# jammin passes the command to `docker run` directly, so no ENTRYPOINT.
# The default CMD is a convenience for `docker run <image>` without args.
CMD ["sh", "-c", "npm install && npm run build"]
