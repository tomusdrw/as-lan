# Machine Wrapper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a high-level `Machine` class wrapping PVM inner machine ecallis (8-13) with type-safe lifecycle management.

**Architecture:** Single `Machine` class in `sdk/jam/refine/machine.ts` with supporting types (`InvokeIo`, `InvokeOutcome`, `ExitReason`, `PageAccess`, error constants). Follows existing SDK patterns (private constructors, static `create()`, `ResultN` errors, panic on host-contract violations). Tests added to `sdk/jam/machine.test.ts` and registered in the SDK test runner. JS mock stubs extended to support configurable error returns.

**Tech Stack:** AssemblyScript (SDK), TypeScript/Node.js (mocks), WAT (PVM adapter — no changes needed)

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `sdk/jam/refine/machine.ts` | Create | `Machine`, `InvokeIo`, `InvokeOutcome`, `ExitReason`, `PageAccess`, `InvalidEntryPoint`, `OutOfBounds` |
| `sdk/jam/refine/index.ts` | Modify | Re-export machine types |
| `sdk/jam/machine.test.ts` | Create | Unit tests for Machine wrapper |
| `sdk/test/test-ecalli/machines.ts` | Create | AS-side `TestMachine` helper for configuring mock behavior |
| `sdk/test/test-ecalli/index.ts` | Modify | Re-export `TestMachine` |
| `sdk-ecalli-mocks/src/refine/machines.ts` | Modify | Add configurable return values for machine/peek/poke/pages/invoke/expunge |
| `sdk-ecalli-mocks/src/refine/index.ts` | Modify | Re-export new config functions |
| `sdk/test/test-run.ts` | Modify | Register machine test suite |
| `docs/src/sdk-api.md` | Modify | Add Machine section |
| `docs/src/testing.md` | Modify | Add TestMachine docs |

---

### Task 1: Core Types — `ExitReason`, `PageAccess`, Error Constants

**Files:**
- Create: `sdk/jam/refine/machine.ts`

- [ ] **Step 1: Create machine.ts with enums and error types**

```typescript
// sdk/jam/refine/machine.ts

/** Exit reason from invoking an inner PVM machine. */
export enum ExitReason {
  Halt = 0,
  Panic = 1,
  Fault = 2,
  Host = 3,
  Oog = 4,
}

/** Page access permission for inner machine memory. */
export enum PageAccess {
  Inaccessible = 0,
  Read = 1,
  ReadWrite = 2,
}

/** Error: machine creation failed due to invalid entrypoint. */
export enum InvalidEntryPoint {
  InvalidEntryPoint = 0,
}

/** Error: peek/poke address out of bounds. */
export enum OutOfBounds {
  OutOfBounds = 0,
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx asc sdk/jam/refine/machine.ts --noEmit`

If the project uses a different compile approach, just run `npm run build` and check for errors in the new file.

- [ ] **Step 3: Commit**

```bash
git add sdk/jam/refine/machine.ts
git commit -m "Add Machine wrapper core types (ExitReason, PageAccess, error enums)"
```

---

### Task 2: `InvokeIo` Class

**Files:**
- Modify: `sdk/jam/refine/machine.ts`

- [ ] **Step 1: Write the failing test for InvokeIo**

Create `sdk/jam/machine.test.ts`:

```typescript
import { Assert, Test, test } from "../test/utils";
import { InvokeIo } from "./refine/machine";

export const TESTS: Test[] = [
  test("InvokeIo.create sets initial gas", () => {
    const a = Assert.create();
    const io = InvokeIo.create(1_000_000);
    a.isEqual(io.gas, 1_000_000, "initial gas");
    return a;
  }),

  test("InvokeIo gas is read/write", () => {
    const a = Assert.create();
    const io = InvokeIo.create(500);
    io.gas = 200;
    a.isEqual(io.gas, 200, "updated gas");
    return a;
  }),

  test("InvokeIo registers default to zero", () => {
    const a = Assert.create();
    const io = InvokeIo.create(100);
    for (let i: u32 = 0; i < 13; i++) {
      a.isEqual(io.getRegister(i), 0, `register ${i}`);
    }
    return a;
  }),

  test("InvokeIo get/set register roundtrip", () => {
    const a = Assert.create();
    const io = InvokeIo.create(100);
    io.setRegister(7, 0xdeadbeef);
    a.isEqual(io.getRegister(7), 0xdeadbeef, "r7 value");
    io.setRegister(0, 42);
    a.isEqual(io.getRegister(0), 42, "r0 value");
    a.isEqual(io.getRegister(7), 0xdeadbeef, "r7 unchanged");
    return a;
  }),
];
```

- [ ] **Step 2: Register the test suite in test-run.ts**

Add to `sdk/test/test-run.ts`:

```typescript
import * as machine from "../jam/machine.test";
```

And in the `runTestSuites` array:

```typescript
    TestSuite.create(machine.TESTS, "machine.ts"),
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test`
Expected: Compilation error — `InvokeIo` doesn't exist yet.

- [ ] **Step 4: Implement InvokeIo**

Add to `sdk/jam/refine/machine.ts`:

```typescript
import { BytesBlob } from "../../core/bytes";

const NUM_REGISTERS: u32 = 13;
const REGISTER_SIZE: u32 = 8; // i64
const GAS_SIZE: u32 = 8; // i64
/** Total size of the invoke I/O structure: gas (8) + 13 registers (8 each) = 112 bytes. */
export const INVOKE_IO_SIZE: u32 = GAS_SIZE + NUM_REGISTERS * REGISTER_SIZE;

/**
 * Typed wrapper over the 112-byte I/O structure used by the `invoke` ecalli.
 *
 * Layout: [gas: i64, r0: i64, r1: i64, ..., r12: i64]
 *
 * The structure is read before invoke (gas limit + initial registers) and
 * written after (gas remaining + final registers). Reuse across invoke calls.
 */
export class InvokeIo {
  static create(gas: u64): InvokeIo {
    const buf = BytesBlob.zero(INVOKE_IO_SIZE);
    const io = new InvokeIo(buf);
    io.gas = gas;
    return io;
  }

  private constructor(
    readonly buf: BytesBlob,
  ) {}

  get gas(): u64 {
    return load<u64>(this.buf.raw.dataStart);
  }

  set gas(value: u64) {
    store<u64>(this.buf.raw.dataStart, value);
  }

  getRegister(index: u32): u64 {
    assert(index < NUM_REGISTERS);
    return load<u64>(this.buf.raw.dataStart + GAS_SIZE + index * REGISTER_SIZE);
  }

  setRegister(index: u32, value: u64): void {
    assert(index < NUM_REGISTERS);
    store<u64>(this.buf.raw.dataStart + GAS_SIZE + index * REGISTER_SIZE, value);
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: All 4 InvokeIo tests pass.

- [ ] **Step 6: Commit**

```bash
git add sdk/jam/refine/machine.ts sdk/jam/machine.test.ts sdk/test/test-run.ts
git commit -m "Add InvokeIo typed wrapper for invoke I/O structure"
```

---

### Task 3: `InvokeOutcome` Class

**Files:**
- Modify: `sdk/jam/refine/machine.ts`
- Modify: `sdk/jam/machine.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `sdk/jam/machine.test.ts` TESTS array:

```typescript
  test("InvokeOutcome holds reason, r8, and io reference", () => {
    const a = Assert.create();
    const io = InvokeIo.create(1000);
    const outcome = InvokeOutcome.create(ExitReason.Host, 12, io);
    a.isEqual(outcome.reason, ExitReason.Host, "reason");
    a.isEqual(outcome.r8, 12, "r8 host call index");
    a.isEqual(outcome.io.gas, 1000, "io reference preserved");
    return a;
  }),
```

Add `InvokeOutcome` and `ExitReason` to the import.

- [ ] **Step 2: Run tests to verify it fails**

Run: `npm test`
Expected: Compilation error — `InvokeOutcome` doesn't exist yet.

- [ ] **Step 3: Implement InvokeOutcome**

Add to `sdk/jam/refine/machine.ts`:

```typescript
/** Result of invoking an inner PVM machine. */
export class InvokeOutcome {
  static create(reason: ExitReason, r8: i64, io: InvokeIo): InvokeOutcome {
    return new InvokeOutcome(reason, r8, io);
  }

  private constructor(
    /** Exit reason (Halt, Panic, Fault, Host, Oog). */
    public readonly reason: ExitReason,
    /** Secondary result: host call index (if Host), fault address (if Fault). */
    public readonly r8: i64,
    /** Reference to the I/O structure — gas and registers reflect post-invoke state. */
    public readonly io: InvokeIo,
  ) {}
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: All tests pass including the new InvokeOutcome test.

- [ ] **Step 5: Commit**

```bash
git add sdk/jam/refine/machine.ts sdk/jam/machine.test.ts
git commit -m "Add InvokeOutcome class"
```

---

### Task 4: Extend JS Mock Stubs

The existing mock stubs always return success. We need configurable return values to test error paths (HUH for `machine`, OOB for `peek`/`poke`, etc.).

**Files:**
- Modify: `sdk-ecalli-mocks/src/refine/machines.ts`
- Modify: `sdk-ecalli-mocks/src/refine/index.ts`

- [ ] **Step 1: Add configurable state to machines.ts**

Replace the contents of `sdk-ecalli-mocks/src/refine/machines.ts` with:

```typescript
// Ecalli 8-13: Inner PVM machine operations.
//
// machine (8), peek (9), poke (10), pages (11), invoke (12), expunge (13)
// are tightly coupled — all operate on inner machines created via machine().

import { writeI64 } from "../memory.js";

let machineCounter = 0;
let machineResult: bigint | null = null;
let peekResult: bigint | null = null;
let pokeResult: bigint | null = null;
let pagesResult: bigint | null = null;
let invokeResult: bigint | null = null;
let invokeR8: bigint = 0n;
let expungeResult: bigint | null = null;

/** Ecalli 8: Create inner PVM machine. */
export function machine(
  _code_ptr: number,
  _code_len: number,
  _entrypoint: number,
): bigint {
  if (machineResult !== null) return machineResult;
  return BigInt(machineCounter++);
}

/** Ecalli 9: Peek inner machine memory — returns OK. */
export function peek(
  _machine_id: number,
  _dest_ptr: number,
  _source: number,
  _length: number,
): bigint {
  if (peekResult !== null) return peekResult;
  return 0n; // OK
}

/** Ecalli 10: Poke inner machine memory — returns OK. */
export function poke(
  _machine_id: number,
  _source_ptr: number,
  _dest: number,
  _length: number,
): bigint {
  if (pokeResult !== null) return pokeResult;
  return 0n; // OK
}

/** Ecalli 11: Set inner machine page access — returns OK. */
export function pages(
  _machine_id: number,
  _start_page: number,
  _page_count: number,
  _access_type: number,
): bigint {
  if (pagesResult !== null) return pagesResult;
  return 0n; // OK
}

/** Ecalli 12: Invoke inner machine — returns HALT (0), writes r8. */
export function invoke(
  _machine_id: number,
  _io_ptr: number,
  out_r8: number,
): bigint {
  writeI64(out_r8, invokeR8);
  if (invokeResult !== null) return invokeResult;
  return 0n; // HALT
}

/** Ecalli 13: Expunge inner machine — returns OK. */
export function expunge(
  _machine_id: number,
): bigint {
  if (expungeResult !== null) return expungeResult;
  return 0n; // OK
}

// ─── Configuration functions (called from AS test-ecalli helpers) ───

export function setMachineResult(result: bigint): void {
  machineResult = result;
}

export function setPeekResult(result: bigint): void {
  peekResult = result;
}

export function setPokeResult(result: bigint): void {
  pokeResult = result;
}

export function setPagesResult(result: bigint): void {
  pagesResult = result;
}

export function setInvokeResult(result: bigint, r8: bigint = 0n): void {
  invokeResult = result;
  invokeR8 = r8;
}

export function setExpungeResult(result: bigint): void {
  expungeResult = result;
}

export function resetMachines(): void {
  machineCounter = 0;
  machineResult = null;
  peekResult = null;
  pokeResult = null;
  pagesResult = null;
  invokeResult = null;
  invokeR8 = 0n;
  expungeResult = null;
}
```

- [ ] **Step 2: Update refine/index.ts to export new config functions**

In `sdk-ecalli-mocks/src/refine/index.ts`, update the machines import to include the new exports:

```typescript
export {
  machine, peek, poke, pages, invoke, expunge, resetMachines,
  setMachineResult, setPeekResult, setPokeResult, setPagesResult, setInvokeResult, setExpungeResult,
} from "./machines.js";
```

- [ ] **Step 3: Verify mocks build**

Run: `npm run build` (or whatever builds the mocks package)
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add sdk-ecalli-mocks/src/refine/machines.ts sdk-ecalli-mocks/src/refine/index.ts
git commit -m "Add configurable return values to machine mock stubs"
```

---

### Task 5: AS-side `TestMachine` Helper

**Files:**
- Create: `sdk/test/test-ecalli/machines.ts`
- Modify: `sdk/test/test-ecalli/index.ts`

- [ ] **Step 1: Create TestMachine helper**

Create `sdk/test/test-ecalli/machines.ts`:

```typescript
// @ts-expect-error: decorator
@external("ecalli", "setMachineResult")
declare function _setMachineResult(result: i64): void;

// @ts-expect-error: decorator
@external("ecalli", "setPeekResult")
declare function _setPeekResult(result: i64): void;

// @ts-expect-error: decorator
@external("ecalli", "setPokeResult")
declare function _setPokeResult(result: i64): void;

// @ts-expect-error: decorator
@external("ecalli", "setPagesResult")
declare function _setPagesResult(result: i64): void;

// @ts-expect-error: decorator
@external("ecalli", "setInvokeResult")
declare function _setInvokeResult(result: i64, r8: i64): void;

// @ts-expect-error: decorator
@external("ecalli", "setExpungeResult")
declare function _setExpungeResult(result: i64): void;

/** Configure machine ecalli stub return values from AS tests. */
export class TestMachine {
  static setMachineResult(result: i64): void {
    _setMachineResult(result);
  }

  static setPeekResult(result: i64): void {
    _setPeekResult(result);
  }

  static setPokeResult(result: i64): void {
    _setPokeResult(result);
  }

  static setPagesResult(result: i64): void {
    _setPagesResult(result);
  }

  static setInvokeResult(result: i64, r8: i64 = 0): void {
    _setInvokeResult(result, r8);
  }

  static setExpungeResult(result: i64): void {
    _setExpungeResult(result);
  }
}
```

- [ ] **Step 2: Export from test-ecalli/index.ts**

Add to `sdk/test/test-ecalli/index.ts`:

```typescript
export { TestMachine } from "./machines";
```

- [ ] **Step 3: Verify it compiles**

Run: `npm test`
Expected: Tests still pass (no new tests yet, just infrastructure).

- [ ] **Step 4: Commit**

```bash
git add sdk/test/test-ecalli/machines.ts sdk/test/test-ecalli/index.ts
git commit -m "Add TestMachine AS-side helper for configuring machine mock stubs"
```

---

### Task 6: `Machine` Class — Create and Expunge

**Files:**
- Modify: `sdk/jam/refine/machine.ts`
- Modify: `sdk/jam/machine.test.ts`

- [ ] **Step 1: Write failing tests for create and expunge**

Add to the imports in `sdk/jam/machine.test.ts`:

```typescript
import { TestEcalli, TestMachine } from "../test/test-ecalli";
import { EcalliResult } from "../ecalli";
import { BytesBlob } from "../core/bytes";
import { ExitReason, InvalidEntryPoint, InvokeIo, InvokeOutcome, Machine } from "./refine/machine";
```

Add tests to the TESTS array:

```typescript
  test("Machine.create returns machine on success", () => {
    TestEcalli.reset();
    const a = Assert.create();
    const code = BytesBlob.zero(4);
    const result = Machine.create(code, 0);
    a.isEqual(result.isOkay, true, "should succeed");
    return a;
  }),

  test("Machine.create returns InvalidEntryPoint on HUH", () => {
    TestEcalli.reset();
    const a = Assert.create();
    TestMachine.setMachineResult(EcalliResult.HUH);
    const code = BytesBlob.zero(4);
    const result = Machine.create(code, 999);
    a.isEqual(result.isError, true, "should be error");
    a.isEqual(result.error, InvalidEntryPoint.InvalidEntryPoint, "error type");
    return a;
  }),

  test("Machine.expunge returns result", () => {
    TestEcalli.reset();
    const a = Assert.create();
    const code = BytesBlob.zero(4);
    const m = Machine.create(code, 0).okay!;
    const hash = m.expunge();
    a.isEqual(hash, 0, "expunge result");
    return a;
  }),
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: Compilation error — `Machine` doesn't exist yet.

- [ ] **Step 3: Implement Machine.create and expunge**

Add imports and the `Machine` class to `sdk/jam/refine/machine.ts`:

```typescript
import { panic } from "../../core/panic";
import { ResultN } from "../../core/result";
import { EcalliResult } from "../../ecalli";
import { machine as ecalli_machine } from "../../ecalli/refine/machine";
import { expunge as ecalli_expunge } from "../../ecalli/refine/expunge";

/**
 * High-level wrapper for inner PVM machine lifecycle (ecalli 8-13).
 *
 * Create a machine with {@link Machine.create}, use peek/poke/pages/invoke
 * to interact with it, and call expunge when done.
 */
export class Machine {
  static create(code: BytesBlob, entrypoint: u32): ResultN<Machine, InvalidEntryPoint> {
    const result = ecalli_machine(code.ptr(), code.length, entrypoint);
    if (result === EcalliResult.HUH) {
      return ResultN.err<Machine, InvalidEntryPoint>(InvalidEntryPoint.InvalidEntryPoint);
    }
    return ResultN.ok<Machine, InvalidEntryPoint>(new Machine(u32(result)));
  }

  private constructor(
    private readonly id: u32,
  ) {}

  /** Destroy the inner machine and return the host result (hash). */
  expunge(): i64 {
    const result = ecalli_expunge(this.id);
    if (result === EcalliResult.WHO) panic("expunge: unknown machine ID (WHO)");
    return result;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: All tests pass including the new Machine tests.

- [ ] **Step 5: Commit**

```bash
git add sdk/jam/refine/machine.ts sdk/jam/machine.test.ts
git commit -m "Add Machine.create and expunge with InvalidEntryPoint error"
```

---

### Task 7: `Machine.pages`

**Files:**
- Modify: `sdk/jam/refine/machine.ts`
- Modify: `sdk/jam/machine.test.ts`

- [ ] **Step 1: Write failing tests**

Add to `sdk/jam/machine.test.ts` imports:

```typescript
import { ExitReason, InvalidEntryPoint, InvokeIo, InvokeOutcome, Machine, PageAccess } from "./refine/machine";
```

Add tests:

```typescript
  test("Machine.pages sets page access", () => {
    TestEcalli.reset();
    const a = Assert.create();
    const code = BytesBlob.zero(4);
    const m = Machine.create(code, 0).okay!;
    m.pages(0, 1, PageAccess.ReadWrite);
    // No error = success (panics on WHO/HUH)
    a.isEqual(true, true, "pages succeeded");
    return a;
  }),
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: Compilation error — `pages` method doesn't exist on `Machine`.

- [ ] **Step 3: Implement Machine.pages**

Add import to `sdk/jam/refine/machine.ts`:

```typescript
import { pages as ecalli_pages } from "../../ecalli/refine/pages";
```

Add method to `Machine` class:

```typescript
  /** Set page access permissions for inner machine memory. */
  pages(startPage: u32, pageCount: u32, access: PageAccess): void {
    const result = ecalli_pages(this.id, startPage, pageCount, access);
    if (result === EcalliResult.WHO) panic("pages: unknown machine ID (WHO)");
    if (result === EcalliResult.HUH) panic("pages: invalid access type (HUH)");
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add sdk/jam/refine/machine.ts sdk/jam/machine.test.ts
git commit -m "Add Machine.pages with PageAccess enum"
```

---

### Task 8: `Machine.peek` and `Machine.poke`

**Files:**
- Modify: `sdk/jam/refine/machine.ts`
- Modify: `sdk/jam/machine.test.ts`

- [ ] **Step 1: Write failing tests**

Add `OutOfBounds` to the import from `./refine/machine`. Add tests:

```typescript
  test("Machine.poke writes data to inner machine", () => {
    TestEcalli.reset();
    const a = Assert.create();
    const code = BytesBlob.zero(4);
    const m = Machine.create(code, 0).okay!;
    const data = BytesBlob.zero(4);
    const result = m.poke(0, data);
    a.isEqual(result.isOkay, true, "poke ok");
    return a;
  }),

  test("Machine.poke returns OutOfBounds on OOB", () => {
    TestEcalli.reset();
    const a = Assert.create();
    const code = BytesBlob.zero(4);
    const m = Machine.create(code, 0).okay!;
    TestMachine.setPokeResult(EcalliResult.OOB);
    const data = BytesBlob.zero(4);
    const result = m.poke(0, data);
    a.isEqual(result.isError, true, "poke error");
    a.isEqual(result.error, OutOfBounds.OutOfBounds, "OOB error");
    return a;
  }),

  test("Machine.peek reads data from inner machine", () => {
    TestEcalli.reset();
    const a = Assert.create();
    const code = BytesBlob.zero(4);
    const m = Machine.create(code, 0).okay!;
    const buf = BytesBlob.zero(4);
    const result = m.peek(0, buf);
    a.isEqual(result.isOkay, true, "peek ok");
    return a;
  }),

  test("Machine.peek returns OutOfBounds on OOB", () => {
    TestEcalli.reset();
    const a = Assert.create();
    const code = BytesBlob.zero(4);
    const m = Machine.create(code, 0).okay!;
    TestMachine.setPeekResult(EcalliResult.OOB);
    const buf = BytesBlob.zero(4);
    const result = m.peek(0, buf);
    a.isEqual(result.isError, true, "peek error");
    a.isEqual(result.error, OutOfBounds.OutOfBounds, "OOB error");
    return a;
  }),
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: Compilation error — `peek`/`poke` don't exist on `Machine`.

- [ ] **Step 3: Implement Machine.peek and Machine.poke**

Add imports to `sdk/jam/refine/machine.ts`:

```typescript
import { peek as ecalli_peek } from "../../ecalli/refine/peek";
import { poke as ecalli_poke } from "../../ecalli/refine/poke";
```

Add methods to `Machine` class:

```typescript
  /** Read data from inner machine memory into the provided buffer. */
  peek(source: u32, dest: BytesBlob): ResultN<bool, OutOfBounds> {
    const result = ecalli_peek(this.id, dest.ptr(), source, dest.length);
    if (result === EcalliResult.WHO) panic("peek: unknown machine ID (WHO)");
    if (result === EcalliResult.OOB) return ResultN.err<bool, OutOfBounds>(OutOfBounds.OutOfBounds);
    return ResultN.ok<bool, OutOfBounds>(true);
  }

  /** Write data into inner machine memory. */
  poke(dest: u32, data: BytesBlob): ResultN<bool, OutOfBounds> {
    const result = ecalli_poke(this.id, data.ptr(), dest, data.length);
    if (result === EcalliResult.WHO) panic("poke: unknown machine ID (WHO)");
    if (result === EcalliResult.OOB) return ResultN.err<bool, OutOfBounds>(OutOfBounds.OutOfBounds);
    return ResultN.ok<bool, OutOfBounds>(true);
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: All tests pass. If `ResultN<void, ...>` causes AS issues, adjust to use a compatible pattern (e.g., `ResultN<u8, OutOfBounds>` returning `0` for OK).

- [ ] **Step 5: Commit**

```bash
git add sdk/jam/refine/machine.ts sdk/jam/machine.test.ts
git commit -m "Add Machine.peek and Machine.poke with OutOfBounds error"
```

---

### Task 9: `Machine.invoke`

**Files:**
- Modify: `sdk/jam/refine/machine.ts`
- Modify: `sdk/jam/machine.test.ts`

- [ ] **Step 1: Write failing tests**

Add tests to `sdk/jam/machine.test.ts`:

```typescript
  test("Machine.invoke returns Halt by default", () => {
    TestEcalli.reset();
    const a = Assert.create();
    const code = BytesBlob.zero(4);
    const m = Machine.create(code, 0).okay!;
    const io = InvokeIo.create(1_000_000);
    const outcome = m.invoke(io);
    a.isEqual(outcome.reason, ExitReason.Halt, "exit reason");
    a.isEqual(outcome.r8, 0, "r8 default");
    a.isEqual(outcome.io.gas, 1_000_000, "io reference");
    return a;
  }),

  test("Machine.invoke returns Host with host call index in r8", () => {
    TestEcalli.reset();
    const a = Assert.create();
    TestMachine.setInvokeResult(i64(ExitReason.Host), 12);
    const code = BytesBlob.zero(4);
    const m = Machine.create(code, 0).okay!;
    const io = InvokeIo.create(500);
    const outcome = m.invoke(io);
    a.isEqual(outcome.reason, ExitReason.Host, "exit reason");
    a.isEqual(outcome.r8, 12, "host call index");
    return a;
  }),

  test("Machine.invoke returns Oog", () => {
    TestEcalli.reset();
    const a = Assert.create();
    TestMachine.setInvokeResult(i64(ExitReason.Oog));
    const code = BytesBlob.zero(4);
    const m = Machine.create(code, 0).okay!;
    const io = InvokeIo.create(1);
    const outcome = m.invoke(io);
    a.isEqual(outcome.reason, ExitReason.Oog, "exit reason");
    return a;
  }),
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: Compilation error — `invoke` method doesn't exist on `Machine`.

- [ ] **Step 3: Implement Machine.invoke**

Add import to `sdk/jam/refine/machine.ts`:

```typescript
import { invoke as ecalli_invoke } from "../../ecalli/refine/invoke";
```

Add method to `Machine` class:

```typescript
  /**
   * Run the inner PVM machine.
   *
   * The InvokeIo structure is read before execution (gas limit + initial registers)
   * and written after (gas remaining + final registers). The same InvokeIo is
   * returned inside InvokeOutcome for convenience.
   */
  invoke(io: InvokeIo): InvokeOutcome {
    const outR8 = BytesBlob.zero(8);
    const result = ecalli_invoke(this.id, io.buf.ptr(), outR8.ptr());
    if (result === EcalliResult.WHO) panic("invoke: unknown machine ID (WHO)");
    const r8 = load<i64>(outR8.raw.dataStart);
    const reason: ExitReason = u32(result);
    return InvokeOutcome.create(reason, r8, io);
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add sdk/jam/refine/machine.ts sdk/jam/machine.test.ts
git commit -m "Add Machine.invoke returning InvokeOutcome"
```

---

### Task 10: Re-export from index.ts

**Files:**
- Modify: `sdk/jam/refine/index.ts`

- [ ] **Step 1: Add machine exports to refine/index.ts**

Add to `sdk/jam/refine/index.ts`:

```typescript
export {
  ExitReason,
  InvalidEntryPoint,
  InvokeIo,
  InvokeOutcome,
  Machine,
  OutOfBounds,
  PageAccess,
} from "./machine";
```

- [ ] **Step 2: Verify build**

Run: `npm test`
Expected: All tests pass, no export conflicts.

- [ ] **Step 3: Commit**

```bash
git add sdk/jam/refine/index.ts
git commit -m "Re-export Machine types from refine/index.ts"
```

---

### Task 11: Update Documentation

**Files:**
- Modify: `docs/src/sdk-api.md`
- Modify: `docs/src/testing.md`

- [ ] **Step 1: Add Machine section to sdk-api.md**

Add after the "Parsed Argument Types" section (after line 134) in `docs/src/sdk-api.md`:

```markdown
## Machine (Inner PVM)

High-level wrapper for creating and running inner PVM machines (ecalli 8-13).
Available in the refine context only.

```typescript
import { Machine, InvokeIo, ExitReason, PageAccess, BytesBlob } from "@fluffylabs/as-lan";

const code: BytesBlob = /* PVM bytecode */;
const result = Machine.create(code, 0);
if (result.isError) { /* InvalidEntryPoint */ return; }
const machine = result.okay!;

// Set up memory pages and write data
machine.pages(0, 1, PageAccess.ReadWrite);
machine.poke(0, myData);

// Run with host-call loop
const io = InvokeIo.create(1_000_000);
io.setRegister(7, someArg);

let outcome = machine.invoke(io);
while (outcome.reason == ExitReason.Host) {
  // Handle host call (outcome.r8 = host call index)
  outcome.io.setRegister(7, responseValue);
  outcome = machine.invoke(io);
}

// Read results and clean up
const buf = BytesBlob.zero(32);
machine.peek(0, buf);
const hash = machine.expunge();
```

### Machine API

- **`Machine.create(code, entrypoint)`** — Create inner PVM. Returns `ResultN<Machine, InvalidEntryPoint>`.
- **`machine.peek(source, dest)`** — Read from inner machine memory. Returns `ResultN<bool, OutOfBounds>`.
- **`machine.poke(dest, data)`** — Write to inner machine memory. Returns `ResultN<bool, OutOfBounds>`.
- **`machine.pages(startPage, pageCount, access)`** — Set page access permissions. Panics on invalid state.
- **`machine.invoke(io)`** — Run the machine. Returns `InvokeOutcome` with `.reason`, `.r8`, `.io`.
- **`machine.expunge()`** — Destroy the machine. Returns `i64` result.

### InvokeIo

Typed wrapper for the 112-byte gas+registers I/O structure:

- **`InvokeIo.create(gas)`** — Create with initial gas limit, zeroed registers.
- **`.gas`** — Get/set gas (read limit before invoke, remaining after).
- **`.getRegister(index)`** / **`.setRegister(index, value)`** — Access registers r0-r12.

### ExitReason

`Halt` (0), `Panic` (1), `Fault` (2), `Host` (3), `Oog` (4).

### PageAccess

`Inaccessible` (0), `Read` (1), `ReadWrite` (2).
```

- [ ] **Step 2: Add TestMachine section to testing.md**

Add after the "TestExportSegment" section (after line 189) in `docs/src/testing.md`:

```markdown
### TestMachine

Configure machine ecalli stub return values (refine context, ecalli 8-13):

```typescript
import { TestMachine } from "@fluffylabs/as-lan/test";
import { EcalliResult } from "@fluffylabs/as-lan";

// Make machine() return HUH (invalid entrypoint)
TestMachine.setMachineResult(EcalliResult.HUH);

// Make peek() return OOB
TestMachine.setPeekResult(EcalliResult.OOB);

// Make poke() return OOB
TestMachine.setPokeResult(EcalliResult.OOB);

// Make invoke() return Host (3) with host call index 12 in r8
TestMachine.setInvokeResult(3, 12);

// Make expunge() return a specific hash
TestMachine.setExpungeResult(0x42n);
```

By default, `machine()` returns incrementing IDs, `invoke()` returns HALT, and
all other operations return OK. Use `TestEcalli.reset()` to restore defaults.
```

- [ ] **Step 3: Verify docs build (if applicable)**

Run: `npm run build` or check that no markdown linting issues exist.

- [ ] **Step 4: Commit**

```bash
git add docs/src/sdk-api.md docs/src/testing.md
git commit -m "Add Machine wrapper documentation to SDK API and testing guides"
```
