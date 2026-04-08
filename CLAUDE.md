# as-lan

AssemblyScript SDK for writing JAM (Join-Accumulate Machine) services.

## Project Structure

```text
sdk/                        AssemblyScript SDK library
  core/                     Core types: bytes, byte-buf, codec (Encoder/Decoder), mem, pack, panic, result
  ecalli/                   Host call declarations (@external decorators)
    general/                Ecalli 0-5, 100 (gas, fetch, lookup, read, write, info, log)
    refine/                 Ecalli 6-13 (historical_lookup, export, machine, peek, poke, pages, invoke, expunge)
    accumulate/             Ecalli 14-26 (bless, assign, designate, checkpoint, new_service, upgrade, transfer, eject, query, solicit, forget, yield_result, provide)
  jam/                      JAM protocol types
    types.ts                Core type aliases (ServiceId, Slot, CodeHash, etc.)
    service.ts              Service ABI: RefineArgs, AccumulateArgs, Response + codec classes
    account-info.ts         AccountInfo (96-byte service info from ecalli 5) + AccountInfoCodec
    service-data.ts         ServiceData (info, read) + CurrentServiceData (adds write) — high-level storage wrappers
    fetcher.ts              Base Fetcher class with buffer management (constants only)
    work-package-fetcher.ts Intermediate fetcher adding typed kinds 7-13 (WorkPackage, etc.)
    work-package.ts         WorkPackage, WorkItem, WorkItemInfo, RefinementContext, ImportRef, ExtrinsicRef + codec classes
    accumulate/             Accumulate-context types and fetcher
      item.ts               Operand, PendingTransfer, WorkExecResult, AccumulateItem + codec classes
      fetcher.ts            AccumulateFetcher (entropy, allTransfersAndOperands, oneTransferOrOperand)
    refine/                 Refine-context fetcher
      fetcher.ts            RefineFetcher (entropy, authorizerTrace, extrinsics, imports + inherits kinds 7-13)
    authorize/              Authorize-context fetcher
      fetcher.ts            AuthorizeFetcher (inherits constants + kinds 7-13 from WorkPackageFetcher)
  test/                     Test framework (Assert, TestSuite, strBlob, unpackResult)
    test-ecalli/            Test helpers for configuring mock stubs from AS
sdk-ecalli-mocks/           JS-side mock stubs for ecalli host calls (used in tests)
  src/
    memory.ts               Shared WASM memory helpers
    general/                Mock stubs for ecalli 0-5, 100 (incl. fetch kind=14/15 for accumulate items)
    refine/                 Mock stubs for ecalli 6-13
    accumulate/             Mock stubs for ecalli 14-26
pvm-adapter.wat             WAT adapter mapping WASM imports to PVM host_call_N intrinsics
examples/
  authorizer/               Example authorizer service (is_authorized)
  fibonacci/                Example service (refine + accumulate)
  all-ecalli/               Smoke-test service invoking every ecalli (refine + accumulate + authorize)
    assembly/
      refine.ts             Refine entry point — invokes general (0-5, 100) + refine (6-13) ecallis
      accumulate.ts         Accumulate entry point — invokes general + accumulate (14-26) ecallis
      authorize.ts          Authorize entry point — invokes general + authorize-context fetch kinds (0, 7-13)
      index.ts              Self-authorizing dispatch: len==2 → is_authorized, else → refine
      test-data.ts          AuthQueue, AutoAccumulate, ValidatorKeys — test data classes with codecs
  ecalli-test/              Example that exercises all ecalli host calls via dispatch
    assembly/
      refine.ts             Refine entry point — dispatches general + refine ecallis
      accumulate.ts         Accumulate entry point — fetches operands/transfers via fetch(kind=15)
      authorize.ts          Authorize entry point — dispatches general ecallis via authConfig payload
      index.ts              Self-authorizing dispatch: len==2 → is_authorized, else → refine
      dispatch/             Dispatch functions grouped by ecalli category
        common.ts           Shared logger and outputLen helper
        general.ts          Ecalli 0-5, 100 dispatch
        refine.ts           Ecalli 6-13 dispatch
        accumulate.ts       Ecalli 14-26 dispatch
      refine.test.ts        Tests for general + refine ecallis (17 tests)
      accumulate.test.ts    Tests for accumulate ecallis via operand/transfer flow (14 tests)
      authorize.test.ts     Tests for general ecallis via authorize dispatch (7 tests)
      test-helpers.ts       Shared test utilities (callRefine, callAccumulate, builders)
docs/                       Documentation (mdbook)
```

## Key Concepts

- **Ecalli**: Host calls exposed by the PVM runtime. Declared as `@external("ecalli", "name")` in AS.
- **PVM adapter**: WAT module that bridges WASM function imports to PVM `host_call_N` instructions.
  - `host_call_N`: N = number of data registers (r7-r12). Returns r7.
  - `host_call_Nb`: Same but also captures r8. Use `host_call_r8()` in same function to read it.
  - `pvm_ptr`: Converts WASM address to PVM address (for pointer arguments).
- **sdk-ecalli-mocks**: JS stubs wired as WASM imports during test. Export names must match `@external` names exactly.
- **EcalliResult**: Sentinel constants (NONE=-1, WHO=-4, FULL=-5, etc.) shared across all host calls.
- **panic(msg)** (`sdk/core/panic.ts`): Use for host-contract violations where recovery is impossible (e.g. host returned malformed data, invalid entry point arguments). Do NOT use for expected failures — use `Result` or `Optional` instead. The SDK does not allow recovering from invalid host data — these are always panics, never `Result`.
- **Self-authorizing services**: A single service can handle both `is_authorized` and `refine` by detecting the invocation context from input length. `is_authorized` receives exactly 2 bytes (u16 core index), `refine` receives 10+ bytes (RefineArgs). The `index.ts` dispatch pattern: `if (len == 2) return is_authorized(ptr, len); return refine_(ptr, len);`. See `examples/all-ecalli/` and `examples/ecalli-test/`.

### Codec Pattern (sdk/core/codec/ + sdk/jam/)

Domain types are **pure data classes** (no encode/decode methods). Serialization is handled by separate **codec classes** implementing `TryDecode<T>` and `TryEncode<T>`. Codecs with dependencies take them as constructor params. There are **no global codec singletons** — all codec instances live on Context objects.

```ts
// Data class — pure data, private constructor + static create()
export class ImportRef {
  static create(hash: Bytes32, isWorkPackageHash: bool, index: u32): ImportRef { ... }
  private constructor(public hash: Bytes32, ...) {}
}

// Codec class — in same file, after data class. Dependencies via constructor.
export class ImportRefCodec implements TryDecode<ImportRef>, TryEncode<ImportRef> {
  static create(): ImportRefCodec { return new ImportRefCodec(); }
  private constructor() {}
  decode(d: Decoder): Result<ImportRef, DecodeError> { ... }
  encode(value: ImportRef, e: Encoder): void { ... }
}
```

**Composing codecs** — use Decoder/Encoder helpers instead of manual loops:
- `d.sequenceVarLen<T>(codec)` — decode a length-prefixed sequence
- `d.object<T>(codec)` — decode a nested composite type
- `e.sequenceVarLen<T>(codec, values)` — encode a length-prefixed sequence
- `e.object<T>(codec, value)` — encode a nested composite type

### Invocation Contexts (sdk/jam/\*/context.ts)

Contexts group all codec instances + convenience methods for a specific invocation type. They must be created **inside the entry point function** (not at module scope) and named `ctx`:

```ts
export function accumulate(ptr: u32, len: u32): u64 {
  const ctx = AccumulateContext.create();
  const fetcher = AccumulateFetcher.create(ctx);
  const args = ctx.parseArgs(ptr, len);
  // ... use fetcher and ctx ...
  return ctx.respond(result, data);
}
```

Contexts:
- **AccumulateContext** — `parseArgs()` (panics on invalid data), `respond()`, `yieldHash()`, accumulate codecs
- **RefineContext** (extends WorkPackageContext) — `parseArgs()` (panics on invalid data), `respond()`, refine + work-package codecs
- **AuthorizeContext** — `parseCoreIndex(ptr, len)` returns `CoreIndex` (u16). No codec state.
- **WorkPackageContext** — base with bytes32, protocolConstants, workPackage, etc.

Fetchers receive their context via constructor: `AccumulateFetcher.create(ctx)`, `RefineFetcher.create(ctx)`.
`AuthorizeFetcher.create()` takes no context (authorize context is stateless).

### Service ABI Types (sdk/jam/service.ts)

- **RefineArgs / AccumulateArgs**: Pure data classes. Parse via `ctx.parseArgs(ptr, len)` (panics on invalid data).
- **Response**: Use `Response.with(result, data?)` for quick ptrAndLen encoding. Decode via `ctx.response`.

### Fetcher Hierarchy (sdk/jam/)

High-level wrappers around the raw `fetch` ecalli (Ω_Y, GP Appendix B.5).
Each fetcher receives its context via constructor and exposes typed fetch methods.

Methods that fetch **non-indexed, always-present** data return `T` directly and
panic if the host returns NONE (host-contract violation). Methods that fetch
**indexed** data (where the index may be out of bounds) return `T | null`.

```text
Fetcher primitives (fetchRaw, fetchRawOrPanic, fetchBlob, fetchBlobOrPanic, fetchAndDecode, fetchAndDecodeOptional)
  ├── WorkPackageFetcher(ctx) (kinds 0, 7-13: constants, WorkPackage, etc.)
  │     ├── AuthorizeFetcher(ctx) (kinds 0, 7-13)
  │     └── RefineFetcher(ctx) (adds entropy, trace, extrinsics, imports — kinds 0-13)
  └── AccumulateFetcher(ctx) (kinds 0-1, 14-15: constants, entropy, accumulate items)
```

GP fetch parameter mapping per context (eq B.1, B.6, B.11):
- **Is-Authorized**: `Ω_Y(ρ, φ, μ, 𝐩, ∅, ∅, ∅, ∅, ∅, ∅, ∅)` → p set, rest ∅
- **Refine**: `Ω_Y(ρ, φ, μ, p, H₀, r, i, ī, x̄, ∅, (m,e))` → all except 𝐢
- **Accumulate**: `Ω_Y(ρ, φ, μ, ∅, η'₀, ∅, ∅, ∅, ∅, 𝐢, (x,y))` → n and 𝐢 only

### ServiceData (sdk/jam/service-data.ts)

High-level wrappers for service storage (`read`/`write` ecallis) and account info (`info` ecalli).

- **ServiceData** — read-only access to any service by ID. Methods: `info()` → `Optional<AccountInfo>`, `read(key)` → `Optional<Uint8Array>`.
- **CurrentServiceData** extends ServiceData — adds `write(key, value)` → `Result<OptionalN<u64>, WriteError>` for the current service (uses `u32.MAX_VALUE` as service ID).
- Both manage an internal reusable buffer with auto-expansion (same pattern as `FetchBuffer`).
- `info()` panics on decode failure (host-contract violation). `read()` returns `Optional.none` for missing keys. `write()` returns `WriteError.Full` when storage quota is exceeded.

### Accumulate Flow

1. `accumulate(ptr, len)` receives `AccumulateArgs` (slot, serviceId, argsLength)
2. Service calls `fetch(kind=15, index)` for each item (0..argsLength-1)
3. Each item starts with a varint tag: 0=Operand, 1=Transfer
4. Operands contain a `WorkExecResult` — if Ok, the `okBlob` carries the refine output
5. Transfers contain source, destination, amount, memo (128 bytes), gas

## Build & Test

```bash
npm run build    # Build mocks + example (includes wasm-pvm compile)
npm test         # Build mocks + run SDK tests + example tests
```

## Conventions

- SDK files are AssemblyScript (`.ts` with AS-specific types like `u32`, `i64`, `usize`).
- Mock files are standard TypeScript targeting ES2022 (use `number` for u32, `bigint` for i64/u64).
- Each ecalli gets a dedicated SDK declaration file. Tightly-coupled calls share mock files.
- The WAT adapter uses `i64.extend_i32_u` for u32 params and `$pvm_ptr` for pointer-to-memory args.
- Dispatch functions return `Response.with(result, data?)` — never use raw `ptrAndLen` encoding.
- Use `d.varU32()` (not `u32(d.varU64())`) when decoding a varint that must fit in u32 — it validates the range and sets `isError` on overflow.
- Test helpers for configuring mock state from AS go in `sdk/test/test-ecalli/` using `@external("ecalli", ...)` bridging.
- All classes must have private constructors and use static builder methods (e.g. `ClassName.create(...)`) — never expose `new ClassName(...)` to callers.
- **Prefer `ByteBuf.strAscii()` / `BytesBlob.encodeAscii()` over `String.UTF8.encode`** for ASCII strings (log targets, storage keys, etc.). It avoids pulling in the full UTF-8 machinery (~520 B WASM / ~1.15 KB PVM). Use `ByteBuf.strUtf8()` / `BytesBlob.encodeUtf8()` when full UTF-8 is needed. Exception: `Logger` keeps `String.UTF8.encode` because code using `Logger` already pulls in string machinery via template literals — switching Logger has zero size benefit and causes AS compiler code-generation issues.
