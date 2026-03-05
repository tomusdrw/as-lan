# SDK API

## Service Framework

- **`registerService(refine, accumulate)`** — Register your service callbacks. Must be called exactly once at module initialization.
- **`registerAuthorized(isAuthorized)`** — Register an authorization callback. Cannot be combined with `registerService` in the same module.
- **`refine_ext`**, **`accumulate_ext`**, **`is_authorized_ext`** — WASM entry points to re-export from your `assembly/index.ts`. The SDK handles ABI encoding/decoding between the host and your callbacks.

### Entry Point Pattern

```typescript
import { registerService } from "@fluffylabs/as-lan";
import { accumulate, refine } from "./service";

registerService(refine, accumulate);

export { refine_ext, accumulate_ext, is_authorized_ext, result_ptr, result_len } from "@fluffylabs/as-lan";
```

## Types

All types are imported from `"@fluffylabs/as-lan"`.

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
| `Bytes32` | Fixed-size 32-byte wrapper with hex parsing |

## Utilities

### Logger

JIP-1 structured logger with levels: `fatal`, `warn`, `info`, `debug`, `trace`.

```typescript
import { Logger } from "@fluffylabs/as-lan";

const logger = new Logger("my-service");
logger.info("processing work item");
logger.debug(`payload length: ${payload.length}`);
```

### Decoder

Binary protocol decoder for reading host-provided data.

```typescript
import { Decoder } from "@fluffylabs/as-lan";
// Supports: varU64, bytes, composites
```

### Byte Types

- **`Bytes32`** — Fixed-size 32-byte array with hex string parsing
- **`BytesBlob`** — Variable-length byte array wrapper
