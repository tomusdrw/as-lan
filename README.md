# as-lan

AssemblyScript SDK for building [JAM](https://jam.web3.foundation/) services.

**[Full Documentation](https://todr.me/as-lan/)**

## Quick Start

Scaffold a new service project with one command:

```bash
curl -sL https://todr.me/as-lan/start.sh | bash -s my-service
cd my-service
npm run build
```

This creates a ready-to-build project with the SDK wired up as a git submodule. Edit `assembly/service.ts` to implement your service logic.

See the [Getting Started guide](https://todr.me/as-lan/getting-started.html) for details on what gets generated and next steps.

## Repository Structure

```
as-lan/
├── sdk/                    # Reusable SDK (add as git submodule)
│   ├── core/               # Bytes, codec, result types
│   ├── jam/                # JAM-specific type aliases
│   ├── imports.ts          # Host function declarations (gas, lookup, log)
│   ├── logger.ts           # JIP-1 structured logger
│   ├── service.ts          # Service framework (registerService + ABI glue)
│   ├── test.ts             # Test harness (Assert, Test)
│   └── index.ts            # Barrel export
├── examples/
│   └── fibonacci/          # Example: Fibonacci service
└── package.json
```

## Creating a New Service

### 1. Set up your project

Add the SDK as a git submodule (or use `file:` dependency for local dev):

```bash
git submodule add <as-lan-repo-url> sdk
```

In your `package.json`:
```json
{
  "devDependencies": {
    "@fluffylabs/as-lan": "file:./sdk",
    "assemblyscript": "^0.28.9"
  }
}
```

### 2. Implement your service callbacks

Create `assembly/my-service.ts`:

```typescript
import { BytesBlob, Bytes32, Logger, Optional } from "@fluffylabs/as-lan";
import { CodeHash, CoreIndex, ServiceId, Slot, WorkOutput, WorkPackageHash } from "@fluffylabs/as-lan";

const logger = new Logger("my-service");

export function accumulate(slot: Slot, serviceId: ServiceId, argsLength: u32): Optional<CodeHash> {
  logger.info(`accumulate called for service ${serviceId} at slot ${slot}`);
  // Your accumulate logic here
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
  // Your refine logic here
  return payload;
}
```

### 3. Wire up the entry point

Create `assembly/index.ts`:

```typescript
import { registerService } from "@fluffylabs/as-lan";
import { accumulate, refine } from "./my-service";

// Register your callbacks (must be called once at module init)
registerService(refine, accumulate);

// Re-export WASM entry points that the host will call
export { refine_ext, accumulate_ext, is_authorized_ext } from "@fluffylabs/as-lan";
```

### 4. Configure AssemblyScript

Create `asconfig.json`:
```json
{
  "targets": {
    "release": {
      "outFile": "build/release.wasm",
      "optimizeLevel": 3,
      "shrinkLevel": 0
    }
  },
  "options": {
    "bindings": "esm"
  }
}
```

### 5. Build

```bash
npx asc assembly/index.ts --target release --runtime=stub
```

## SDK API

### Service Framework

- **`registerService(refine, accumulate)`** — Register your service callbacks. Must be called exactly once at module initialization.
- **`registerAuthorized(isAuthorized)`** — Register an authorization callback. Cannot be combined with `registerService` in the same module.
- **`refine_ext`**, **`accumulate_ext`**, **`is_authorized_ext`** — WASM entry points to re-export. The SDK handles ABI encoding/decoding.

### Types (from `@fluffylabs/as-lan`)

| Type | Description |
|------|-------------|
| `Slot` | Block slot number (`u32`) |
| `ServiceId` | Service identifier (`u32`) |
| `CoreIndex` | Core index (`u16`) |
| `CodeHash` | 32-byte blake2b hash |
| `WorkPackageHash` | 32-byte work package hash |
| `BytesBlob` | Variable-length byte array |
| `WorkOutput` | Alias for `BytesBlob` |
| `Optional<T>` | Option type with `.isSome` and `.val` |

### Utilities

- **`Logger`** — JIP-1 structured logger with levels: `fatal`, `warn`, `info`, `debug`, `trace`
- **`Decoder`** — Binary protocol decoder (varU64, bytes, composites)
- **`Bytes32`** / **`BytesBlob`** — Typed byte array wrappers with hex parsing

## Development

```bash
# Install dependencies
npm install

# Build the fibonacci example
npm run build

# Run tests (SDK + example)
npm test

# Lint & format
npm run qa
npm run qa-fix
```

## License

MPL-2.0
