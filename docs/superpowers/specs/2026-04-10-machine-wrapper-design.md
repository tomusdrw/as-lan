# Machine Wrapper Design

High-level wrapper for PVM inner machine ecallis (8-13: machine, peek, poke, pages, invoke, expunge).

## Goal

Provide a type-safe `Machine` class that enforces correct usage of inner machine host calls. The wrapper ensures the create-use-destroy lifecycle is natural and prevents common mistakes (wrong byte layout for invoke I/O, invalid page access values, etc.).

## API

### Machine

```ts
export class Machine {
  static create(code: BytesBlob, entrypoint: u32): ResultN<Machine, InvalidEntryPoint>

  peek(source: u32, dest: BytesBlob): ResultN<void, OutOfBounds>
  poke(dest: u32, data: BytesBlob): ResultN<void, OutOfBounds>
  pages(startPage: u32, pageCount: u32, access: PageAccess): void
  invoke(io: InvokeIo): InvokeOutcome
  expunge(): i64
}
```

- `create()` — wraps ecalli 8 (`machine`). Returns `InvalidEntryPoint` on HUH.
- `peek()` — wraps ecalli 9. Reads from inner machine memory into caller-provided buffer. Returns `OutOfBounds` on OOB.
- `poke()` — wraps ecalli 10. Writes caller-provided data into inner machine memory. Returns `OutOfBounds` on OOB.
- `pages()` — wraps ecalli 11. Sets page access permissions. Panics on WHO (host-contract violation). HUH cannot occur with typed `PageAccess` enum.
- `invoke()` — wraps ecalli 12. Runs the inner machine. Mutates `InvokeIo` in place (gas remaining + final registers). Returns `InvokeOutcome`.
- `expunge()` — wraps ecalli 13. Destroys the inner machine and returns the raw i64 result (hash).

All methods panic on WHO (unknown machine ID) — this is a host-contract violation that indicates a bug, not a recoverable error.

### InvokeIo

Typed wrapper over the 112-byte I/O structure read/written by `invoke`.

Layout: `[gas: i64, r0: i64, r1: i64, ..., r12: i64]` (8 + 13 x 8 = 112 bytes).

```ts
const NUM_REGISTERS: u32 = 13;
const INVOKE_IO_SIZE: u32 = 8 + NUM_REGISTERS * 8; // 112 bytes

export class InvokeIo {
  static create(gas: u64): InvokeIo

  gas: u64                              // get/set — gas limit in, gas remaining out
  getRegister(index: u32): u64          // r0-r12
  setRegister(index: u32, value: u64): void
}
```

The same `InvokeIo` instance is reused across multiple invoke calls in a HOST loop. After invoke, `gas` reflects remaining gas and registers reflect the inner machine's final state.

### InvokeOutcome

```ts
export class InvokeOutcome {
  static create(reason: ExitReason, r8: i64, io: InvokeIo): InvokeOutcome

  readonly reason: ExitReason
  readonly r8: i64       // host call index (if HOST), fault address (if FAULT)
  readonly io: InvokeIo  // reference to the same InvokeIo passed to invoke()
}
```

### ExitReason

```ts
export enum ExitReason {
  Halt = 0,
  Panic = 1,
  Fault = 2,
  Host = 3,
  Oog = 4,
}
```

### PageAccess

```ts
export enum PageAccess {
  Inaccessible = 0,
  Read = 1,
  ReadWrite = 2,
}
```

### Error Types

Single-variant enums following SDK convention (same pattern as `WriteError`, `ExportSegmentError`):

```ts
export enum InvalidEntryPoint {
  InvalidEntryPoint = 0,
}

export enum OutOfBounds {
  OutOfBounds = 0,
}
```

## Usage Example

```ts
const code: BytesBlob = ...;
const result = Machine.create(code, 0);
if (result.isError) { /* invalid entrypoint */ return; }
const machine = result.okay!;

// Set up memory
machine.pages(0, 1, PageAccess.ReadWrite);
machine.poke(0, myData);

// Run with host-call loop
const io = InvokeIo.create(1_000_000);
io.setRegister(7, someArg);

let outcome = machine.invoke(io);
while (outcome.reason == ExitReason.Host) {
  // Handle host call using outcome.r8 (host call index)
  // Read/write registers via outcome.io
  outcome.io.setRegister(7, responseValue);
  outcome = machine.invoke(io);
}

// Read results
const resultBuf = BytesBlob.zero(32);
machine.peek(0, resultBuf);

// Clean up
const hash = machine.expunge();
```

## File Placement

- **`sdk/jam/refine/machine.ts`** — `Machine`, `InvokeIo`, `InvokeOutcome`, `ExitReason`, `PageAccess`, `InvalidEntryPoint`, `OutOfBounds`
- **Re-exported** from `sdk/jam/refine/index.ts`
- **Docs update** — `docs/src/sdk-api.md` gets a Machine section

## Testing

- Unit tests for all `Machine` methods (success + error paths)
- `InvokeIo` gas/register get/set tests
- Test-ecalli helpers in `sdk/test/test-ecalli/` for configuring mock behavior
- May extend JS mock stubs in `sdk-ecalli-mocks/src/refine/machines.ts` for error path testing (OOB, HUH)
