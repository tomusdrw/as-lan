# SDK API

## Calling Convention

Your service WASM module must export one of:
- `refine(ptr: u32, len: u32) -> u64` and `accumulate(ptr: u32, len: u32) -> u64` for a regular service
- `is_authorized(ptr: u32, len: u32) -> u64` for an authorizer service

Arguments are passed as a pointer + length into linear memory. The return value is a packed `u64` where `len = result >> 32` and `ptr = result & 0xffffffff`. Use `.toPtrAndLen()` on a `BytesBlob` to produce this value.

## Service Helpers

The SDK provides helpers for parsing arguments and encoding results:

- **`RefineArgs.parse(ptr, len)`** — Parse raw refine arguments. Returns `Result<RefineArgs, string>`.
- **`AccumulateArgs.parse(ptr, len)`** — Parse raw accumulate arguments. Returns `Result<AccumulateArgs, string>`.
- **`encodeOptionalCodeHash(hash)`** — Encode an `Optional<CodeHash>` as a `BytesBlob` (for accumulate results).
- **`readFromMemory(ptr, len)`** — Read raw bytes from WASM linear memory.
- **`ptrAndLen(data)`** — Pack a raw `Uint8Array` into a `u64` return value.

To return a result, call `.toPtrAndLen()` on a `BytesBlob` (or use `ptrAndLen()` for a raw `Uint8Array`).

### Entry Point Pattern

```typescript
// assembly/index.ts
export { refine, accumulate } from "./service";
```

```typescript
// assembly/service.ts
import { Logger, Optional, RefineArgs, AccumulateArgs, encodeOptionalCodeHash } from "@fluffylabs/as-lan";
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
  return args.payload.toPtrAndLen();
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
| `PayloadHash` | 32-byte blake2b payload hash |
| `WorkPackageHash` | 32-byte work package hash |
| `HeaderHash` | 32-byte blake2b header hash |
| `StateRootHash` | 32-byte blake2b state root hash |
| `MmrPeakHash` | 32-byte keccak256 MMR peak hash |
| `BytesBlob` | Variable-length byte array with `.toPtrAndLen()` |
| `WorkOutput` | Alias for `BytesBlob` |
| `WorkPayload` | Alias for `BytesBlob` |
| `AuthOutput` | Alias for `BytesBlob` |
| `Optional<T>` | Option type with `.isSome` and `.val` (nullable `T`) |
| `OptionalN<T>` | Option type for non-nullable `T` |
| `Result<Ok, Err>` | Result type with `.isOkay`, `.okay`, `.isError`, `.error` |
| `ResultN<Ok, Err>` | Result type for non-nullable `Ok` |
| `Bytes32` | Fixed-size 32-byte wrapper with hex parsing |

## Utilities

### Logger

JIP-1 structured logger. Methods: `fatal`, `warn`, `info`, `debug`, `trace`.

`debug` and `trace` are compiled out at optimization level 3 (release builds).

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

const decoder = Decoder.fromBlob(data);
const value = decoder.varU64();
const hash = decoder.bytes32();
const blob = decoder.bytesVarLen();
```

Key methods: `u8`, `u16`, `u32`, `u64`, `varU64`, `bytes32`, `bytesFixLen`, `bytesVarLen`, `object`, `optional`, `sequenceFixLen`, `sequenceVarLen`, `skip`, `isFinished`, `isError`.

### Byte Types

- **`Bytes32`** — Fixed-size 32-byte array with hex string parsing
- **`BytesBlob`** — Variable-length byte array wrapper with `.toPtrAndLen()` for returning results

### Host Calls (ecalli)

Declared host functions available to services:

- **`gas()`** — Returns remaining gas (`i64`).
- **`lookup(service, hash_ptr, out_ptr, out_len)`** — Look up data by service and hash.
- **`log(level, target_ptr, target_len, message_ptr, message_len)`** — JIP-1 debug logging (prefer using the `Logger` class instead).

### Test Utilities

The SDK exports test helpers for writing AssemblyScript tests:

```typescript
import { test, Assert } from "@fluffylabs/as-lan/test";

const allTests = [
  test("my test", (): Assert => {
    const a = new Assert();
    a.isEqual(1 + 1, 2, "basic math");
    return a;
  }),
];
```

See the [Testing](./testing.md) guide for the full test framework, including
configurable ecalli mocks (`TestGas`, `TestFetch`, `TestLookup`, `TestStorage`).
