# Common (All Contexts)

These wrappers are available in all invocation contexts (refine, accumulate, authorize).

## Gas

All context classes expose `remainingGas()` which returns the gas remaining
after the call (ecalli 0):

```typescript
const gasLeft = ctx.remainingGas();  // i64
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

Wraps the `lookup` ecalli with buffer management and auto-expansion.

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

Context-specific extensions (`RefinePreimages`, `AccumulatePreimages`) are
documented under their respective context pages.
