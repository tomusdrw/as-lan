# as-lan

AssemblyScript SDK for writing JAM (Join-Accumulate Machine) services.

## Project Structure

```text
sdk/                        AssemblyScript SDK library
  ecalli/                   Host call declarations (@external decorators)
    general/                Ecalli 0-5, 100 (gas, fetch, lookup, read, write, info, log)
    refine/                 Ecalli 6-13 (historical_lookup, export, machine, peek, poke, pages, invoke, expunge)
    accumulate/             Ecalli 14-26 (bless, assign, designate, checkpoint, new_service, upgrade, transfer, eject, query, solicit, forget, yield_result, provide)
  test/                     Test framework (Assert, TestSuite) + test-ecalli wrappers
sdk-ecalli-mocks/           JS-side mock stubs for ecalli host calls (used in tests)
  src/
    memory.ts               Shared WASM memory helpers
    general/                Mock stubs for ecalli 0-5, 100
    refine/                 Mock stubs for ecalli 6-13
    accumulate/             Mock stubs for ecalli 14-26
pvm-adapter.wat             WAT adapter mapping WASM imports to PVM host_call_N intrinsics
examples/
  fibonacci/                Example service (refine + accumulate)
  ecalli-test/              Example that exercises ecalli host calls
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
