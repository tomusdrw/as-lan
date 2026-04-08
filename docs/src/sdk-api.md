# SDK API

## Calling Convention

Your service WASM module must export one of:
- `refine(ptr: u32, len: u32) -> u64` and `accumulate(ptr: u32, len: u32) -> u64` for a regular service
- `is_authorized(ptr: u32, len: u32) -> u64` for an authorizer service

Arguments are passed as a pointer + length into linear memory. The return value is a packed `u64` where `len = result >> 32` and `ptr = result & 0xffffffff`. Use `.toPtrAndLen()` on a `BytesBlob` to produce this value.

## Service Helpers

The SDK provides helpers for parsing arguments and encoding results:

- **`ctx.parseArgs(ptr, len)`** — Parse raw refine/accumulate arguments. Panics on invalid host-provided entry-point data.
- **`ctx.yieldHash(hash)`** — Encode an optional accumulate result hash and return the packed `u64`.
- **`readFromMemory(ptr, len)`** — Read raw bytes from WASM linear memory.
- **`ptrAndLen(data)`** — Pack a raw `Uint8Array` into a `u64` return value.

To return a result, call `.toPtrAndLen()` on a `BytesBlob` (or use `ptrAndLen()` for a raw `Uint8Array`).

### Entry Point Pattern (Regular Service)

```typescript
// assembly/index.ts
export { refine, accumulate } from "./service";
```

```typescript
// assembly/service.ts
import { AccumulateContext, Logger, RefineContext } from "@fluffylabs/as-lan";
import { CodeHash } from "@fluffylabs/as-lan";

const logger = Logger.create("my-service");

export function accumulate(ptr: u32, len: u32): u64 {
  const ctx = AccumulateContext.create();
  const args = ctx.parseArgs(ptr, len);
  logger.info(`accumulate called for service ${args.serviceId}`);
  return ctx.yieldHash(null);
}

export function refine(ptr: u32, len: u32): u64 {
  const ctx = RefineContext.create();
  const args = ctx.parseArgs(ptr, len);
  logger.info(`refine called for service ${args.serviceId}`);
  return args.payload.toPtrAndLen();
}
```

### Entry Point Pattern (Authorizer Service)

An authorizer service must export a single `is_authorized` function. It receives
the core index, and returns an authorization trace (opaque bytes passed to the
accumulate stage).

```typescript
// assembly/index.ts
export { is_authorized } from "./authorize";
```

```typescript
// assembly/authorize.ts
import { AuthorizeContext, AuthorizeFetcher, ByteBuf, panic, ptrAndLen } from "@fluffylabs/as-lan";

export function is_authorized(ptr: u32, len: u32): u64 {
  const ctx = AuthorizeContext.create();
  const coreIndex = ctx.parseCoreIndex(ptr, len);
  const fetcher = AuthorizeFetcher.create();

  const authConfig = fetcher.authConfig();
  const token = fetcher.authToken();

  // Example: reject if the token doesn't match the config
  if (!token.isEqualTo(authConfig)) {
    panic("Authorization failed");
  }

  // Return an authorization trace
  const trace = ByteBuf.create(7 + token.length)
    .strAscii("Auth=<")
    .bytes(token.raw)
    .strAscii(">")
    .finish();
  return ptrAndLen(trace);
}
```

The `AuthorizeFetcher` provides access to work-package data (fetch kinds 0, 7–13),
including `authConfig()` and `authToken()`. See the [authorizer example](https://github.com/fluffylabs/as-lan/tree/main/examples/authorizer) for a complete project.

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
| `BytesBlob` | Variable-length byte array with `.toPtrAndLen()`, `.ptr()`, `.encodeAscii()`, `.encodeUtf8()` |
| `WorkOutput` | Alias for `BytesBlob` |
| `WorkPayload` | Alias for `BytesBlob` |
| `AuthOutput` | Alias for `BytesBlob` |
| `Optional<T>` | Option type with `.isSome` and `.val` (nullable `T`) |
| `OptionalN<T>` | Option type for non-nullable `T` |
| `Result<Ok, Err>` | Result type with `.isOkay`, `.okay`, `.isError`, `.error` |
| `ResultN<Ok, Err>` | Result type for non-nullable `Ok` |
| `Bytes32` | Fixed-size 32-byte wrapper with hex parsing, `.ptr()` |

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
- **`.blob(data)`** — append a `BytesBlob` as `0x`-prefixed hex (no String allocation)

Terminal methods (send the message and reset the buffer):
- **`.fatal()`**, **`.warn()`**, **`.info()`**, **`.debug()`**, **`.trace()`**

`debug` and `trace` are compiled out at optimization level 3, same as `Logger`.

### ByteBuf (byte-buffer builder)

A lightweight `Uint8Array` builder that avoids String allocations. Used
internally by `LogMsg` and useful for constructing binary output (e.g. auth
traces) from string fragments and raw byte slices.

```typescript
import { ByteBuf, ptrAndLen } from "@fluffylabs/as-lan";

const result = ByteBuf.create(64)
  .str("Auth=<")
  .bytes(token.raw)
  .str(">")
  .finish();           // → Uint8Array
return ptrAndLen(result);
```

Static constructors:
- **`ByteBuf.create(capacity)`** — allocate a new buffer with given capacity (default 256)
- **`ByteBuf.wrap(data)`** — wrap an existing `Uint8Array`; writes go directly into the array

Builder methods (all return `ByteBuf` for chaining):
- **`.strAscii(s)`** — append an ASCII string (1 byte per char, no UTF-8 overhead)
- **`.strUtf8(s)`** — append a UTF-8 encoded string
- **`.bytes(data)`** — append raw `Uint8Array`
- **`.hex(data)`** — append `Uint8Array` as `0x`-prefixed hex
- **`.u32(v)`**, **`.u64(v)`**, **`.i32(v)`** — append numbers as decimal ASCII

Terminal methods:
- **`.finish()`** — copy buffer into a new `Uint8Array` and reset
- **`.reset()`** — discard contents without producing output

The buffer is heap-allocated at a fixed capacity; writes beyond the capacity
are silently truncated.

> **Binary size tip:** Prefer `.strAscii()` over `.strUtf8()` for ASCII strings
> (log targets, storage keys, etc.). `.strUtf8()` pulls in the full UTF-8 machinery
> (~520 B WASM / ~1.15 KB PVM). See [Coding Guidelines](../../CODING_GUIDELINES.md).

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

- **`Bytes32`** — Fixed-size 32-byte array with hex string parsing and `.ptr()` for raw pointer access
- **`BytesBlob`** — Variable-length byte array wrapper with `.toPtrAndLen()` for returning results and `.ptr()` for raw pointer access. Factory methods: `BytesBlob.wrap(data)`, `BytesBlob.encodeAscii(str)`, `BytesBlob.encodeUtf8(str)`, `BytesBlob.zero(len)`, `BytesBlob.empty()`

### Fetchers

High-level wrappers around the `fetch` ecalli (kind 0-15). Each fetcher manages
an internal buffer with auto-expansion and exposes typed methods.

```typescript
import { RefineFetcher, AccumulateFetcher, AuthorizeFetcher } from "@fluffylabs/as-lan";

// In refine context:
const fetcher = RefineFetcher.create();
const wp = fetcher.workPackage();
const entropy = fetcher.entropy();
const payload = fetcher.workItemPayload(0);  // Optional<BytesBlob>

// In accumulate context:
const fetcher = AccumulateFetcher.create();
const items = fetcher.allTransfersAndOperands();
const one = fetcher.oneTransferOrOperand(0);  // Optional<AccumulateItem>

// In authorize context:
const fetcher = AuthorizeFetcher.create();
const config = fetcher.authConfig();
```

### Service Data

High-level wrappers for service storage (`read`/`write`) and account info (`info`).

```typescript
import { ServiceData, CurrentServiceData } from "@fluffylabs/as-lan";

// Read-only access to any service
const svc = ServiceData.create(42);
const info = svc.info();             // Optional<AccountInfo>
const val = svc.read(key);           // Optional<Uint8Array>

// Read/write access to the current service
const current = CurrentServiceData.create();
const result = current.write(key, value);  // Result<OptionalN<u64>, WriteError>
```

### Preimages

High-level wrappers for preimage host calls. Uses composition — each context
gets a class with the operations available to it.

```text
Preimages (lookup)
  ├── RefinePreimages  (adds historicalLookup)
  └── AccumulatePreimages (adds query, solicit, forget, provide)
```

**`Preimages`** — available in all contexts. Wraps the `lookup` ecalli with
buffer management and auto-expansion.

```typescript
import { Preimages, Bytes32 } from "@fluffylabs/as-lan";

const preimages = Preimages.create();
const hash = Bytes32.zero();  // or a real hash
const result = preimages.lookup(hash);  // Optional<BytesBlob>
if (result.isSome) {
  const data = result.val!;
  // use data...
}

// Look up a preimage for a different service:
const other = preimages.lookup(hash, 42);
```

**`RefinePreimages`** — available during refinement. Adds `historicalLookup`
which queries the historical state.

```typescript
import { RefinePreimages, Bytes32 } from "@fluffylabs/as-lan";

const preimages = RefinePreimages.create();
const current = preimages.lookup(hash);              // Optional<BytesBlob>
const historical = preimages.historicalLookup(hash);  // Optional<BytesBlob>
```

**`AccumulatePreimages`** — available during accumulation. Adds preimage
lifecycle management.

```typescript
import { AccumulatePreimages, Bytes32, BytesBlob } from "@fluffylabs/as-lan";
import { PreimageStatusKind } from "@fluffylabs/as-lan";

const preimages = AccumulatePreimages.create();

// Look up
const data = preimages.lookup(hash);  // Optional<BytesBlob>

// Query status of a solicited preimage
const status = preimages.query(hash, 64);  // Optional<PreimageStatus>
if (status.isSome) {
  const s = status.val!;
  if (s.kind === PreimageStatusKind.Available) {
    // s.slot0 = timeslot when it became available
  }
}

// Solicit a preimage (request it be made available)
const r1 = preimages.solicit(hash, 64);  // ResultN<bool, SolicitError>

// Forget a solicitation
const r2 = preimages.forget(hash, 64);   // ResultN<bool, ForgetError>

// Provide a preimage to a service
const r3 = preimages.provide(BytesBlob.wrap(data));  // ResultN<bool, ProvideError>
```

**`PreimageStatus`** — returned by `query()`. A tagged value with `kind` and
up to 3 timeslot fields:

| Kind | Fields | Meaning |
|------|--------|---------|
| `Requested` | — | Solicited but not yet available |
| `Available` | `slot0` | Currently available (added at slot0) |
| `Unavailable` | `slot0`, `slot1` | Was available, now removed |
| `Reavailable` | `slot0`, `slot1`, `slot2` | Removed then re-added |

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
