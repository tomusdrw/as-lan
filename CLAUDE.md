# as-lan

AssemblyScript SDK for writing JAM (Join-Accumulate Machine) services.

## Project Structure

```text
sdk/                        AssemblyScript SDK library
  core/                     Core types: bytes, codec (Encoder/Decoder), mem, pack, result
  ecalli/                   Host call declarations (@external decorators)
    general/                Ecalli 0-5, 100 (gas, fetch, lookup, read, write, info, log)
    refine/                 Ecalli 6-13 (historical_lookup, export, machine, peek, poke, pages, invoke, expunge)
    accumulate/             Ecalli 14-26 (bless, assign, designate, checkpoint, new_service, upgrade, transfer, eject, query, solicit, forget, yield_result, provide)
  jam/                      JAM protocol types
    types.ts                Core type aliases (ServiceId, Slot, CodeHash, etc.)
    service.ts              Service ABI: RefineArgs, AccumulateArgs, Response (encode/decode)
    accumulate-item.ts      Accumulate items: Operand, PendingTransfer, WorkExecResult (encode/decode)
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
  fibonacci/                Example service (refine + accumulate)
  ecalli-test/              Example that exercises all ecalli host calls
    assembly/
      refine.ts             Refine entry point — dispatches general + refine ecallis
      accumulate.ts         Accumulate entry point — fetches operands/transfers via fetch(kind=15)
      dispatch/             Dispatch functions grouped by ecalli category
        common.ts           Shared logger and outputLen helper
        general.ts          Ecalli 0-5, 100 dispatch
        refine.ts           Ecalli 6-13 dispatch
        accumulate.ts       Ecalli 14-26 dispatch
      refine.test.ts        Tests for general + refine ecallis (17 tests)
      accumulate.test.ts    Tests for accumulate ecallis via operand/transfer flow (14 tests)
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

### Service ABI Types (sdk/jam/)

- **RefineArgs / AccumulateArgs**: Parse incoming arguments with `.parse(ptr, len)`, encode with `.encode(e)`.
- **Response**: Ecalli dispatch return type. Use `Response.with(result, data?)` to encode + pack as `u64`. Use `Response.decode(raw)` to read back.
- **Operand**: Work result from refine. Decoded from `fetch(kind=15)` with tag=0. Contains `WorkExecResult` with the refine output blob.
- **PendingTransfer**: Incoming balance transfer. Decoded from `fetch(kind=15)` with tag=1.
- All types have both `encode(e)` and `static decode(d)` methods. Operand/PendingTransfer also have `encodeTagged(e)` which prepends the discriminator tag.

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
- Test helpers for configuring mock state from AS go in `sdk/test/test-ecalli/` using `@external("ecalli", ...)` bridging.
