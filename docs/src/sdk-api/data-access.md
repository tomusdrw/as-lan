# Data Access

## Fetchers

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

## Service Data

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

## Preimages

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

## Context Wrappers

`RefineContext` and `AccumulateContext` provide high-level methods for common
host calls that are specific to their invocation context.

**`RefineContext.exportSegment`** — export a data segment (ecalli 7). Returns
the segment index on success, or `ExportSegmentError.Full` when the limit is reached.

```typescript
import { RefineContext, ExportSegmentError, BytesBlob } from "@fluffylabs/as-lan";

const ctx = RefineContext.create();
const segment = BytesBlob.wrap(data);
const result = ctx.exportSegment(segment);  // ResultN<u32, ExportSegmentError>
if (result.isOkay) {
  const index = result.okay;  // segment index
}
```

**`AccumulateContext.checkpoint`** — commit all state changes up to this point
(ecalli 17). Returns the remaining gas after the checkpoint.

**`AccumulateContext.yieldResult`** — provide the accumulation result hash
(ecalli 25).

```typescript
import { AccumulateContext, Bytes32 } from "@fluffylabs/as-lan";

const ctx = AccumulateContext.create();
const gas = ctx.checkpoint();          // i64 — remaining gas
ctx.yieldResult(Bytes32.zero());       // void
```

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
