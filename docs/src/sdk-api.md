# SDK API

## Calling Convention

Your service WASM module must export one of:
- `refine(ptr: u32, len: u32) -> u64` and `accumulate(ptr: u32, len: u32) -> u64` for a regular service
- `is_authorized(ptr: u32, len: u32) -> u64` for an authorizer service

Arguments are passed as a pointer + length into linear memory. The return value is a packed `u64` where `len = result >> 32` and `ptr = result & 0xffffffff`. Use `.toPtrAndLen()` on a `BytesBlob` to produce this value.

## Service Helpers

The SDK provides helpers for parsing arguments and encoding results:

- **`RefineArgs.parse(ptr, len)`** — Parse raw refine arguments. Returns `Result<RefineArgs, ParseError>`.
- **`AccumulateArgs.parse(ptr, len)`** — Parse raw accumulate arguments. Returns `Result<AccumulateArgs, ParseError>`.
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

const logger = Logger.create("my-service");

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

### ParseError

Both `RefineArgs.parse()` and `AccumulateArgs.parse()` return
`Result<T, ParseError>`. The `ParseError` enum (defined in `sdk/service.ts`)
has the following variants:

| Variant | Value | Trigger |
|---------|-------|---------|
| `CoreIndexOutOfRange` | 0 | Decoded core index exceeds `u16` range |
| `ItemIndexOutOfRange` | 1 | Decoded item index exceeds `u32` range |
| `ServiceIdOutOfRange` | 2 | Decoded service ID exceeds `u32` range |
| `SlotOutOfRange` | 3 | Decoded slot exceeds `u32` range |
| `ArgsLengthOutOfRange` | 4 | Decoded args length exceeds `u32` range |
| `DecodeError` | 5 | Underlying `Decoder` failed (malformed varint, truncated input, etc.) |
| `TrailingBytes` | 6 | Input was not fully consumed after parsing all fields |

Handling example:

```typescript
const result = AccumulateArgs.parse(ptr, len);
if (result.isError) {
  // result.error is a ParseError (i32 enum value)
  logger.str("parse failed: ").i32(result.error).warn();
  return 0;
}
const args = result.okay!;
```

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

const logger = Logger.create("my-service");
logger.info("processing work item");
logger.debug(`payload length: ${payload.length}`);
```

> **Binary size note:** `Logger` accepts `string` messages, so using template literals
> (`` `value: ${n}` ``) pulls in AssemblyScript's string concatenation, UTF-8 encoding,
> and number-to-string machinery. This can add ~1.3 KiB to the WASM output.
> If binary size is a concern, use `LogMsg` instead (see below).

### LogMsg (lightweight logger)

A buffer-based logger that writes directly to a fixed-size byte buffer,
bypassing AssemblyScript's `String` machinery entirely. It uses a builder
pattern to append text and numbers, then sends the raw bytes to the host.

Using `LogMsg` instead of `Logger` can reduce WASM output by 5KB and PVM
output by 8KB for a typical service. Note that for large services the
trade-off between code size and readability & debuggability might not be worth it.

```typescript
import { LogMsg } from "@fluffylabs/as-lan";

const logger = LogMsg.create("my-service");
logger.str("processing item ").u32(itemId).info();
logger.str("result: ").u64(value).str(" bytes").debug();
```

Builder methods (all return `LogMsg` for chaining):
- **`.str(s)`** — append an ASCII string
- **`.u32(v)`** — append an unsigned 32-bit number as decimal
- **`.u64(v)`** — append an unsigned 64-bit number as decimal
- **`.i32(v)`** — append a signed 32-bit number as decimal

Terminal methods (send the message and reset the buffer):
- **`.fatal()`**, **`.warn()`**, **`.info()`**, **`.debug()`**, **`.trace()`**

`debug` and `trace` are compiled out at optimization level 3, same as `Logger`.

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

Declared host functions available to services. Import from `"@fluffylabs/as-lan"` or
from a specific group (`"@fluffylabs/as-lan/ecalli/general"`, `.../refine`, `.../accumulate`).

**General** (available in all contexts):

| ID | Function | Description |
|----|----------|-------------|
| 0 | `gas()` | Returns remaining gas |
| 1 | `fetch(dest_ptr, offset, length, kind, param1, param2)` | Fetch context data |
| 2 | `lookup(service, hash_ptr, out_ptr, offset, length)` | Look up preimage by hash |
| 3 | `read(service, key_ptr, key_len, out_ptr, offset, length)` | Read from storage |
| 4 | `write(key_ptr, key_len, value_ptr, value_len)` | Write to storage |
| 5 | `info(service, out_ptr, offset, length)` | Get service account info |
| 100 | `log(level, target_ptr, target_len, msg_ptr, msg_len)` | JIP-1 debug log (prefer `Logger`) |

**Refine** (available during refinement):

| ID | Function | Description |
|----|----------|-------------|
| 6 | `historical_lookup(service, hash_ptr, out_ptr, offset, length)` | Historical preimage lookup |
| 7 | `export_(segment_ptr, segment_len)` | Export a data segment |
| 8 | `machine(code_ptr, code_len, entrypoint)` | Create inner PVM machine |
| 9 | `peek(machine_id, dest_ptr, source, length)` | Read inner machine memory |
| 10 | `poke(machine_id, source_ptr, dest, length)` | Write inner machine memory |
| 11 | `pages(machine_id, start_page, page_count, access_type)` | Set inner machine page access |
| 12 | `invoke(machine_id, io_ptr, out_r8)` | Run inner machine (r7=exit reason, r8 written to out\_r8) |
| 13 | `expunge(machine_id)` | Destroy inner machine |

**Accumulate** (available during accumulation):

| ID | Function | Description |
|----|----------|-------------|
| 14 | `bless(manager, auth_queue_ptr, delegator, registrar, auto_accum_ptr, count)` | Set privileged config |
| 15 | `assign(core, auth_queue_ptr, assigners)` | Assign core |
| 16 | `designate(validators_ptr)` | Set next epoch validators |
| 17 | `checkpoint()` | Commit state, return remaining gas |
| 18 | `new_service(code_hash_ptr, code_len, gas, allowance, gratis_storage, id)` | Create service |
| 19 | `upgrade(code_hash_ptr, gas, allowance)` | Upgrade service code |
| 20 | `transfer(dest, amount, gas_fee, memo_ptr)` | Transfer funds |
| 21 | `eject(service, prev_code_hash_ptr)` | Remove service |
| 22 | `query(hash_ptr, length, out_r8)` | Query preimage status (r8 written to out\_r8) |
| 23 | `solicit(hash_ptr, length)` | Request preimage availability |
| 24 | `forget(hash_ptr, length)` | Cancel preimage solicitation |
| 25 | `yield_result(hash_ptr)` | Provide accumulation result hash |
| 26 | `provide(service, preimage_ptr, preimage_len)` | Supply solicited preimage |

All functions return `i64`. Error sentinels are defined in `EcalliResult`:
`NONE` (-1), `WHAT` (-2), `OOB` (-3), `WHO` (-4), `FULL` (-5), `CORE` (-6), `CASH` (-7), `LOW` (-8), `HUH` (-9).

### Test Utilities

The SDK exports test helpers for writing AssemblyScript tests:

```typescript
import { test, Assert } from "@fluffylabs/as-lan/test";

const allTests = [
  test("my test", (): Assert => {
    const a = Assert.create();
    a.isEqual(1 + 1, 2, "basic math");
    return a;
  }),
];
```

See the [Testing](./testing.md) guide for the full test framework, including
configurable ecalli mocks (`TestGas`, `TestFetch`, `TestLookup`, `TestStorage`).
