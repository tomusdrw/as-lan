# Quick Start

## Scaffold a New Service

Create a new JAM service project with a single command:

```bash
curl -sL https://todr.me/as-lan/start.sh | bash -s my-service
cd my-service
npm run build
```

This will:

1. Create a `my-service/` directory with a git repo
2. Add the as-lan SDK as a git submodule
3. Download template files from the [fibonacci example](https://github.com/fluffylabs/as-lan/tree/main/examples/fibonacci) and patch paths
4. Run `npm install`

## What You Get

```
my-service/
├── assembly/
│   ├── index.ts          # Entry point — re-exports refine & accumulate
│   ├── fibonacci.ts      # Example service logic (fibonacci computation)
│   ├── index.test.ts     # Unit tests
│   ├── test-run.ts       # Test runner entry point
│   └── tsconfig.json     # AssemblyScript path mappings
├── bin/
│   └── test.js           # Test runner (node)
├── sdk/                  # as-lan SDK (git submodule)
│   ├── sdk-ecalli-mocks/ # Configurable ecalli stubs for testing
│   └── pvm-adapter.wat   # Adapter mapping WASM imports to PVM ecalli host calls
├── asconfig.json
└── package.json
```

The ecalli host call stubs used for testing live in `sdk/sdk-ecalli-mocks/` and are shared across all services. There is no per-service `ecalli/` directory — just a dependency in `package.json`:

```json
"ecalli": "file:./sdk/sdk-ecalli-mocks"
```

## Implement Your Service

Edit `assembly/fibonacci.ts` (rename it to match your service). You need to implement `refine` and `accumulate` functions (or `is_authorized` for an authorizer service).

Each function takes `(ptr: u32, len: u32)` raw memory arguments and returns a packed `u64` result. The SDK provides helpers for parsing arguments, and results are returned by calling `.toPtrAndLen()` on a `BytesBlob`:

```typescript
import { Logger, Optional, RefineArgs, AccumulateArgs, encodeOptionalCodeHash } from "@fluffylabs/as-lan";
import { CodeHash } from "@fluffylabs/as-lan";

const logger = Logger.create("my-service");

export function accumulate(ptr: u32, len: u32): u64 {
  const result = AccumulateArgs.parse(ptr, len);
  if (result.isError) {
    logger.warn(`Failed to parse accumulate args: ${result.error}`);
    return 0;
  }
  const args = result.okay!;
  logger.info(`accumulate called for service ${args.serviceId} at slot ${args.slot}`);
  // TODO: implement your accumulate logic here
  return encodeOptionalCodeHash(Optional.none<CodeHash>()).toPtrAndLen();
}

export function refine(ptr: u32, len: u32): u64 {
  const result = RefineArgs.parse(ptr, len);
  if (result.isError) {
    logger.warn(`Failed to parse refine args: ${result.error}`);
    return 0;
  }
  const args = result.okay!;
  logger.info(`refine called for service ${args.serviceId}`);
  // TODO: implement your refine logic here — for now, echo payload back
  return args.payload.toPtrAndLen();
}
```

## Build & Test

You need [`wasm-pvm`](https://crates.io/crates/wasm-pvm-cli) installed (`cargo install wasm-pvm-cli@0.7.0`) to produce PVM binaries.

```bash
npm run build          # compile WASM (debug + release) and PVM binary
npm test               # compile test target and run tests
```

The build pipeline:
1. Compiles AssemblyScript to WASM (debug + release targets)
2. Converts the release WASM to a JAM PVM binary (`.pvm`) using `wasm-pvm`

The resulting `build/release.pvm` is the JAM SPI binary ready for deployment.

See the [Testing](./testing.md) guide for details on writing tests and configuring ecalli mocks.

## Manual Setup (without the script)

If you prefer to set things up yourself:

1. Add the SDK as a git submodule:
   ```bash
   git submodule add https://github.com/tomusdrw/as-lan.git sdk
   ```

2. Add dependencies to `package.json`:
   ```json
   {
     "devDependencies": {
       "@fluffylabs/as-lan": "file:./sdk",
       "assemblyscript": "^0.28.9",
       "ecalli": "file:./sdk/sdk-ecalli-mocks"
     }
   }
   ```

3. Build the ecalli mocks before first use:

   ```bash
   cd sdk/sdk-ecalli-mocks && npm install && npm run build && cd ../..
   ```

4. Follow the patterns in the scaffolded project for `assembly/index.ts`, `asconfig.json`, etc.

See the [SDK API](./sdk-api.md) reference for the full list of available types and utilities.
