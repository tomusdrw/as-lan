# Refine

Wrappers available during the `refine` entry point.

## RefineContext

Parses arguments and provides refine-specific convenience methods.
It also serves as the entry point for creating all refine-context helpers
via factory methods — **prefer `ctx.*()` over standalone `*.create()`**.

```typescript
import { RefineContext } from "@fluffylabs/as-lan";

export function refine(ptr: u32, len: u32): u64 {
  const ctx = RefineContext.create();
  const args = ctx.parseArgs(ptr, len);
  // args.coreIndex, args.itemIndex, args.serviceId, args.payload, args.workPackageHash

  const gasLeft = ctx.remainingGas();  // i64 — ecalli 0

  const fetcher = ctx.fetcher();       // RefineFetcher
  const preimages = ctx.preimages();   // RefinePreimages
  const storage = ctx.serviceData();   // CurrentServiceData

  return args.payload.toPtrAndLen();
}
```

**`ctx.remainingGas()`** — return the remaining gas (ecalli 0).

**`ctx.fetcher(bufSize?)`** — create a `RefineFetcher` (fetch kinds 0-13).

**`ctx.preimages(bufSize?)`** — create a `RefinePreimages` helper (lookup + historicalLookup).

**`ctx.serviceData(bufSize?)`** — create a `CurrentServiceData` helper for storage read/write.

**`ctx.machine(code, entrypoint)`** — create an inner PVM `Machine` (ecalli 8).
Returns `ResultN<Machine, InvalidEntryPoint>`.

**`ctx.exportSegment(segment)`** — export a data segment (ecalli 7). Returns
the segment index on success, or `ExportSegmentError.Full` when the limit is reached.

```typescript
const segment = BytesBlob.wrap(data);
const result = ctx.exportSegment(segment);  // ResultN<u32, ExportSegmentError>
if (result.isOkay) {
  const index = result.okay;  // segment index
}
```

## RefineFetcher

Fetches context data (fetch kinds 0-13): protocol constants, work package,
entropy, authorizer trace, extrinsics, imports, and work item payloads.

```typescript
const fetcher = ctx.fetcher();
const wp = fetcher.workPackage();
const entropy = fetcher.entropy();
const payload = fetcher.workItemPayload(0);  // Optional<BytesBlob>
```

## RefinePreimages

Extends base `Preimages` with `historicalLookup` (ecalli 6) for querying
historical state during refinement.

```typescript
const preimages = ctx.preimages();
const current = preimages.lookup(hash);              // Optional<BytesBlob>
const historical = preimages.historicalLookup(hash);  // Optional<BytesBlob>
```

## Machine (Inner PVM)

High-level wrapper for creating and running inner PVM machines (ecalli 8-13).

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
  outcome = machine.invoke(outcome.io);
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

`Halt` (0), `Panic` (1), `Fault` (2), `Host` (3), `Oob` (4).

### PageAccess

`Inaccessible` (0), `Read` (1), `ReadWrite` (2).

### Calling convention for library-style inner PVMs

The `Machine` API is general — you can set up any memory layout and register
state you like. For the common case of invoking a *library* PVM (an inner
blob that takes some input, returns some output, and halts), `examples/library/`
uses a fixed convention mirroring the outer JAM service ABI:

**On entry (before `invoke`):**

- Caller maps a RW page region at `INPUT_ADDR = 0xFEFF0000` via
  `machine.pages(startPage, pageCount, PageAccess.ReadWrite)` sized to fit
  the payload (`pageCount = ceil(payload.length / 4096)`).
- Caller copies the payload into inner memory with `machine.poke(INPUT_ADDR, payload)`.
- Caller sets `io.setRegister(7, INPUT_ADDR)` and `io.setRegister(8, payload.length)`
  — the same `(ptr, len)` convention every JAM service entry point receives.

**On halt:**

- Inner PVM places its output anywhere in its memory and returns a packed
  `ptrAndLen` in `r7` — low 32 bits = address, high 32 bits = length, matching
  the SDK's `ptrAndLen(Uint8Array)` helper.
- Caller unpacks `r7`, calls `machine.peek(outAddr, buf)` for `outLen` bytes,
  then `machine.expunge()`.

**Why this matters:** writing a library PVM to a different convention means
consumers have to special-case your library. Following this convention lets
authors of ed25519, blake2b, and similar verification primitives all be
invoked identically.

See `examples/library/assembly/refine.ts` for the full reference
implementation (error handling, page sizing, peek unwind on failure).
