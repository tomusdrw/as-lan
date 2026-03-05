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
3. Generate all boilerplate (`package.json`, `asconfig.json`, entry point, stub imports)
4. Run `npm install`

## What You Get

```
my-service/
├── assembly/
│   ├── index.ts          # Entry point — re-exports refine & accumulate
│   ├── service.ts        # Your service logic (accumulate + refine)
│   └── tsconfig.json     # AssemblyScript path mappings
├── bin/
│   └── test.js           # Test runner
├── imports/
│   └── index.js          # Stub host imports for local testing
├── sdk/                  # as-lan SDK (git submodule)
├── asconfig.json
└── package.json
```

## Implement Your Service

Edit `assembly/service.ts`. You need to implement `refine` and `accumulate` functions (or `is_authorized` for an authorizer service).

Each function takes `(ptr: u32, len: u32)` raw memory arguments and returns a packed `u64` result. The SDK provides helpers for parsing and packing:

```typescript
import { Logger, Optional, RefineArgs, AccumulateArgs, packResult, encodeOptionalCodeHash } from "@fluffylabs/as-lan";
import { CodeHash } from "@fluffylabs/as-lan";

const logger = new Logger("my-service");

export function accumulate(ptr: u32, len: u32): u64 {
  const result = AccumulateArgs.parse(ptr, len);
  if (result.isError) {
    logger.warn(`Failed to parse accumulate args: ${result.error}`);
    return 0;
  }
  const args = result.okay!;
  logger.info(`accumulate called for service ${args.serviceId} at slot ${args.slot}`);
  // TODO: implement your accumulate logic here
  return packResult(encodeOptionalCodeHash(Optional.none<CodeHash>()));
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
  return packResult(args.payload.raw);
}
```

## Build & Test

```bash
npm run build          # compile WASM (debug + release)
```

## Manual Setup (without the script)

If you prefer to set things up yourself:

1. Add the SDK as a git submodule:
   ```bash
   git submodule add https://github.com/aspect-build/aspect-cli.git sdk
   ```

2. Add dependencies to `package.json`:
   ```json
   {
     "devDependencies": {
       "@fluffylabs/as-lan": "file:./sdk",
       "assemblyscript": "^0.28.9"
     }
   }
   ```

3. Follow the patterns in the scaffolded project for `assembly/index.ts`, `asconfig.json`, etc.

See the [SDK API](./sdk-api.md) reference for the full list of available types and utilities.
