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
// Read/write access to the current service (preferred)
const storage = ctx.serviceData();
const info = storage.info();                  // Optional<AccountInfo>
const val = storage.read(key);               // Optional<Uint8Array>
const result = storage.write(key, value);    // value: BytesBlob → Result<OptionalN<u64>, WriteError>

// Read-only access to another service by ID
const other = ServiceData.create(42);
const otherInfo = other.info();
```

## Preimages

Wraps the `lookup` ecalli with buffer management and auto-expansion.
Each context provides the appropriate preimage helper via `ctx.preimages()`.

```typescript
const preimages = ctx.preimages();  // Preimages, RefinePreimages, or AccumulatePreimages
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
