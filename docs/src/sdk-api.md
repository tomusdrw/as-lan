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

### Entry Point Pattern (Self-Authorizing Service)

A single service can handle both authorization and refinement. In PVM, both
`is_authorized` and `refine` start at PC=0 (accumulate starts at PC=5), so the
entry point must detect which context it's running in at runtime.

The detection uses input length: `is_authorized` receives exactly 2 bytes
(a `u16` core index), while `refine` receives 10+ bytes (`RefineArgs`:
varints + payload + 32-byte hash).

```typescript
// assembly/index.ts
export { accumulate } from "./accumulate";
import { refine as refine_ } from "./refine";
import { is_authorized } from "./authorize";

export function refine(ptr: u32, len: u32): u64 {
  if (len === 2) {
    return is_authorized(ptr, len);
  }
  return refine_(ptr, len);
}
```

The `authorize.ts` and `refine.ts` files use their respective contexts
(`AuthorizeContext` / `RefineContext`) as normal. See
[all-ecalli](https://github.com/fluffylabs/as-lan/tree/main/examples/all-ecalli) and
[ecalli-test](https://github.com/fluffylabs/as-lan/tree/main/examples/ecalli-test)
for complete examples.

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

## Test Utilities

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
