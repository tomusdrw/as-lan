#!/bin/sh
# Bridge the global node_modules into /app for asc/wasm-pvm relative-path
# lookups. AssemblyScript's compiler walks up from the entry file looking
# for `node_modules/` (it does NOT honor NODE_PATH), and jammin's default
# `pvm` script invokes wasm-pvm with `--adapter
# node_modules/@fluffylabs/as-lan/pvm-adapter.wat` — both need
# /app/node_modules to resolve.
#
# Caveat: /app is bind-mounted from the host, so the symlink we create
# there leaks onto the host filesystem. `docker run --rm` only cleans up
# the container's writable layer; bind-mounted paths are user-managed.
# Track ownership and remove the symlink in an EXIT trap so a successful
# run leaves the host directory untouched. SIGINT/SIGTERM are also
# trapped (docker stop hits us with SIGTERM after a 10s grace period).
# SIGKILL is uncatchable — abruptly killed containers may still leak.

CREATED_LINK=

cleanup() {
    if [ -n "$CREATED_LINK" ] && [ -L /app/node_modules ]; then
        rm -f /app/node_modules
    fi
}
trap cleanup EXIT
trap 'cleanup; exit 130' INT
trap 'cleanup; exit 143' TERM

if [ ! -e /app/node_modules ]; then
    ln -s /usr/local/lib/node_modules /app/node_modules
    CREATED_LINK=1
fi

"$@"
