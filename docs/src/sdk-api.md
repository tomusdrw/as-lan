# SDK API

## Calling Convention

Your service WASM module must export one of:
- `refine(ptr: u32, len: u32) -> u64` and `accumulate(ptr: u32, len: u32) -> u64` for a regular service
- `is_authorized(ptr: u32, len: u32) -> u64` for an authorizer service

Arguments are passed as a pointer + length into linear memory. The return value is a packed `u64` where `ptr = result >> 32` and `len = result & 0xffffffff`.

## Service Helpers

The SDK provides helpers for parsing arguments and packing results:

- **`RefineArgs.parse(ptr, len)`** — Parse raw refine arguments. Returns `Result<RefineArgs, string>`.
- **`AccumulateArgs.parse(ptr, len)`** — Parse raw accumulate arguments. Returns `Result<AccumulateArgs, string>`.
- **`packResult(data)`** — Pack a `Uint8Array` result into a `u64` return value.
- **`encodeOptionalCodeHash(hash)`** — Encode an `Optional<CodeHash>` as bytes (for accumulate results).
- **`readFromMemory(ptr, len)`** — Read raw bytes from WASM linear memory.

### Entry Point Pattern

```typescript
// assembly/index.ts
export { refine, accumulate } from "./service";
```

```typescript
// assembly/service.ts
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
  logger.info(`accumulate called for service ${args.serviceId}`);
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
  return packResult(args.payload.raw);
}
```

### Parsed Argument Types

**`RefineArgs`** (fields available after successful parse):
- `coreIndex: CoreIndex` (`u16`)
- `itemIndex: u32`
- `serviceId: ServiceId` (`u32`)
- `payload: BytesBlob`
- `workPackageHash: WorkPackageHash` (`Bytes32`)

**`AccumulateArgs`** (fields available after successful parse):
- `slot: Slot` (`u32`)
- `serviceId: ServiceId` (`u32`)
- `argsLength: u32`

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
