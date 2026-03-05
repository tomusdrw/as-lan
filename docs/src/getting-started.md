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
│   ├── index.ts          # Entry point — registers callbacks & re-exports WASM API
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

Edit `assembly/service.ts`. You need to implement `refine` and `accumulate` callbacks (or `is_authorized` for authorizer service).

```typescript
import { BytesBlob, Logger, Optional } from "@fluffylabs/as-lan";
import {
  CodeHash, CoreIndex, ServiceId, Slot, WorkOutput, WorkPackageHash
} from "@fluffylabs/as-lan";

const logger = new Logger("my-service");

export function accumulate(slot: Slot, serviceId: ServiceId, argsLength: u32): Optional<CodeHash> {
  logger.info(`accumulate called for service ${serviceId} at slot ${slot}`);
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
  return payload;
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
