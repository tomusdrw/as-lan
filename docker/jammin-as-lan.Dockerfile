# syntax=docker/dockerfile:1.7
#
# Builder image for the @fluffylabs/as-lan SDK, compatible with jammin.
# Two-stage: stage 1 compiles wasm-pvm-cli from crates.io, stage 2 is a
# minimal node:24-bookworm-slim runtime carrying only the resulting binary.

# ---- Stage 1: build wasm-pvm ---------------------------------------------
# Pinned to bookworm so the resulting binary's glibc requirements match the
# runtime stage (node:24-bookworm-slim). Unpinned `rust:1-slim` tracks the
# current stable, which may drift to a newer Debian with a higher glibc and
# produce binaries that fail at runtime with `GLIBC_X.Y not found`.
FROM rust:1-slim-bookworm AS builder

# wasm-pvm-cli needs llvm-18 headers + libpolly at compile time. Neither
# Debian bookworm main nor bookworm-backports carries llvm-18 reliably
# (bookworm-backports has rolled forward to newer LLVM majors). Pull it
# from apt.llvm.org, which maintains a stable channel per LLVM major.
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
        ca-certificates \
        gnupg \
        wget \
        build-essential \
        pkg-config \
        zlib1g-dev \
        libzstd-dev; \
    wget -qO- https://apt.llvm.org/llvm-snapshot.gpg.key \
        | gpg --dearmor > /etc/apt/trusted.gpg.d/apt.llvm.org.gpg; \
    echo 'deb http://apt.llvm.org/bookworm/ llvm-toolchain-bookworm-18 main' \
        > /etc/apt/sources.list.d/llvm.list; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
        llvm-18-dev \
        libpolly-18-dev; \
    rm -rf /var/lib/apt/lists/*

# Pin to 0.8.0 with --locked for reproducible builds.
# $CARGO_HOME is /usr/local/cargo in the official rust image, so the
# resulting binary lands at /usr/local/cargo/bin/wasm-pvm.
RUN cargo install wasm-pvm-cli@0.8.0 --locked

# ---- Stage 2: runtime ----------------------------------------------------
FROM node:24-bookworm-slim AS runtime

# ca-certificates: npm registry TLS. git: npm deps pointing at git URLs.
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
        ca-certificates \
        git; \
    rm -rf /var/lib/apt/lists/*

COPY --from=builder /usr/local/cargo/bin/wasm-pvm /usr/local/bin/wasm-pvm

# Pre-bake SDK + mocks + assemblyscript so a mounted service can build
# without running `npm install`. The layout under /opt/as-lan/ mirrors the
# repo so the SDK's prepack hook (`cp ../pvm-adapter.wat .`) resolves.
COPY pvm-adapter.wat        /opt/as-lan/pvm-adapter.wat
COPY sdk-ecalli-mocks       /opt/as-lan/sdk-ecalli-mocks
COPY sdk                    /opt/as-lan/sdk

# Build the mocks (TypeScript -> dist/) so the published-shape package
# resolves "main": "dist/index.js" once globally installed.
RUN cd /opt/as-lan/sdk-ecalli-mocks \
    && npm ci --omit=optional \
    && npm run build

# Read assemblyscript version from sdk/package.json so the image's asc
# matches what the SDK is tested against. --omit=dev keeps SDK devDeps
# (like the file:../sdk-ecalli-mocks alias) out of the global install.
RUN ASC_VERSION=$(node -p \
        "require('/opt/as-lan/sdk/package.json').devDependencies.assemblyscript") \
    && npm install -g --omit=dev \
        /opt/as-lan/sdk \
        /opt/as-lan/sdk-ecalli-mocks \
        "assemblyscript@$ASC_VERSION"

# Make globally-installed packages discoverable to Node code (test runners,
# build scripts) without a local node_modules.
ENV NODE_PATH=/usr/local/lib/node_modules

WORKDIR /app

# AssemblyScript's compiler (`asc`) resolves `import "@fluffylabs/as-lan"` by
# walking up looking for a `node_modules/` directory — it does NOT honor
# NODE_PATH. So at container start we symlink the global install location
# to /app/node_modules unless the mount already supplied one. The symlink
# only lives in the container's writable layer; --rm cleans it up.
ENTRYPOINT ["/bin/sh", "-c", "[ -e /app/node_modules ] || ln -s /usr/local/lib/node_modules /app/node_modules; exec \"$@\"", "--"]

# jammin passes the command to `docker run` directly, so no behavior change
# for it. The default CMD prints usage and exits 64 (EX_USAGE) when the
# image is run with no arguments, so a misuse doesn't masquerade as success.
CMD ["sh", "-c", "cat <<'EOF'\njammin-as-lan: builder image for @fluffylabs/as-lan AssemblyScript services.\n\nMount your service source at /app and pass a build/test command, e.g.:\n  docker run --rm -v \"$(pwd):/app\" jammin-as-lan npm run build\n\nPre-installed (no `npm install` required for these):\n  - @fluffylabs/as-lan\n  - @fluffylabs/as-lan-ecalli-mocks\n  - assemblyscript (asc on PATH)\n\nAlso on PATH:\n  - wasm-pvm\n\nA service whose package.json declares only the three pre-installed packages\nas devDependencies does NOT need to run npm install inside the container.\nEOF\nexit 64"]
