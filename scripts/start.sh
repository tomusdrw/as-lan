#!/usr/bin/env bash
set -euo pipefail

# Scaffold a new JAM service project using the as-lan SDK.
# Usage: init-service.sh <service-name>

if [ $# -lt 1 ]; then
  echo "Usage: $0 <service-name>"
  echo "Example: $0 my-service"
  exit 1
fi

NAME="$1"
AS_LAN_REPO="${AS_LAN_REPO:-https://github.com/aspect-build/aspect-cli.git}"

if [ -d "$NAME" ]; then
  echo "Error: directory '$NAME' already exists."
  exit 1
fi

echo "Creating JAM service '$NAME'..."

mkdir -p "$NAME"
cd "$NAME"

git init -q

echo "Adding as-lan SDK as git submodule..."
git submodule add -q "$AS_LAN_REPO" sdk

# --- package.json ---
cat > package.json <<JSONEOF
{
  "name": "$NAME",
  "version": "0.0.1",
  "description": "$NAME — a JAM service built with as-lan SDK",
  "type": "module",
  "scripts": {
    "asbuild:debug": "asc assembly/index.ts --target debug --runtime=stub",
    "asbuild:release": "asc assembly/index.ts --target release --runtime=stub",
    "asbuild": "npm run asbuild:debug && npm run asbuild:release",
    "build": "npm run asbuild",
    "test": "echo \"No tests configured yet. See bin/test.js for the test runner.\""
  },
  "author": "",
  "license": "MPL-2.0",
  "devDependencies": {
    "@fluffylabs/as-lan": "file:./sdk",
    "assemblyscript": "^0.28.9",
    "imports": "file:./imports"
  },
  "exports": {
    ".": {
      "import": "./build/release.js",
      "types": "./build/release.d.ts"
    }
  }
}
JSONEOF

# --- asconfig.json ---
cat > asconfig.json <<'JSONEOF'
{
  "entries": ["assembly/index.ts"],
  "targets": {
    "debug": {
      "outFile": "build/debug.wasm",
      "textFile": "build/debug.wat",
      "sourceMap": true,
      "debug": true
    },
    "release": {
      "outFile": "build/release.wasm",
      "textFile": "build/release.wat",
      "sourceMap": true,
      "optimizeLevel": 3,
      "shrinkLevel": 0,
      "converge": false,
      "noAssert": false
    },
    "test": {
      "outFile": "build/test.wasm",
      "textFile": "build/test.wat",
      "sourceMap": true,
      "debug": true
    }
  },
  "options": {
    "bindings": "esm"
  }
}
JSONEOF

# --- assembly/tsconfig.json ---
mkdir -p assembly
cat > assembly/tsconfig.json <<'JSONEOF'
{
  "extends": "assemblyscript/std/assembly.json",
  "include": ["./**/*.ts"],
  "compilerOptions": {
    "paths": {
      "@fluffylabs/as-lan": ["../sdk/index.ts"],
      "@fluffylabs/as-lan/*": ["../sdk/*"]
    }
  }
}
JSONEOF

# --- assembly/index.ts ---
cat > assembly/index.ts <<'TSEOF'
import { registerService } from "@fluffylabs/as-lan";
import { accumulate, refine } from "./service";

registerService(refine, accumulate);

// Re-export the SDK's WASM entry points and result globals
export { refine_ext, accumulate_ext, is_authorized_ext, result_ptr, result_len } from "@fluffylabs/as-lan";
TSEOF

# --- assembly/service.ts ---
cat > assembly/service.ts <<'TSEOF'
import { BytesBlob, Logger, Optional } from "@fluffylabs/as-lan";
import { CodeHash, CoreIndex, ServiceId, Slot, WorkOutput, WorkPackageHash } from "@fluffylabs/as-lan";

const logger = new Logger("service");

export function accumulate(slot: Slot, serviceId: ServiceId, argsLength: u32): Optional<CodeHash> {
  logger.info(`accumulate called for service ${serviceId} at slot ${slot}`);
  // TODO: implement your accumulate logic here
  return Optional.none<CodeHash>();
}

export function refine(
  _core: CoreIndex,
  _itemIdx: u32,
  serviceId: ServiceId,
  payload: BytesBlob,
  _hash: WorkPackageHash,
): WorkOutput {
  logger.info(`refine called for service ${serviceId}`);
  // TODO: implement your refine logic here — for now, echo payload back
  return payload;
}
TSEOF

# --- imports/index.js ---
mkdir -p imports
cat > imports/index.js <<'JSEOF'
// Stub implementations of host-provided imports for testing

let wasmMemory = null;

const LOG_LEVELS = ["FATAL", "WARN ", "INFO ", "DEBUG", "TRACE"];

function readUtf8(ptr, len) {
  if (!wasmMemory || !len) return null;
  const bytes = new Uint8Array(wasmMemory.buffer, ptr, len);
  return new TextDecoder().decode(bytes);
}

export function setMemory(memory) {
  wasmMemory = memory;
}

export function gas() {
  return 0n;
}

export function lookup(_service, _hash_ptr, _out_ptr, _out_len) {
  return 0;
}

export function log(level, target_ptr, target_len, message_ptr, message_len) {
  const levelStr = LOG_LEVELS[level] ?? `LVL${level}`;
  const target = readUtf8(target_ptr, target_len);
  const message = readUtf8(message_ptr, message_len);

  if (target && message) {
    console.log(`[${levelStr}] ${target}: ${message}`);
  } else if (message) {
    console.log(`[${levelStr}] ${message}`);
  } else {
    console.log(`[${levelStr}] (ptr=${message_ptr} len=${message_len})`);
  }
  return 0;
}
JSEOF

# --- imports/package.json ---
cat > imports/package.json <<'JSONEOF'
{
  "name": "imports",
  "version": "0.0.1",
  "type": "module",
  "main": "index.js"
}
JSONEOF

# --- bin/test.js ---
mkdir -p bin
cat > bin/test.js <<'JSEOF'
#!/usr/bin/env node

import { setMemory } from "imports";
import { memory, runAllTests } from "../build/test.js";

setMemory(memory);
runAllTests();
JSEOF

# --- .gitignore ---
cat > .gitignore <<'IGNEOF'
node_modules
build
IGNEOF

echo "Installing dependencies..."
npm install

echo ""
echo "Success! Your JAM service '$NAME' is ready."
echo ""
echo "Next steps:"
echo "  cd $NAME"
echo "  npm run build          # compile WASM (debug + release)"
echo "  # edit assembly/service.ts to implement your service logic"
echo ""
