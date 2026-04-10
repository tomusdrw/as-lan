# Accumulate

Wrappers available during the `accumulate` entry point.

## AccumulateContext

Parses arguments and provides accumulate-specific convenience methods.

```typescript
import { AccumulateContext, Bytes32 } from "@fluffylabs/as-lan";

export function accumulate(ptr: u32, len: u32): u64 {
  const ctx = AccumulateContext.create();
  const args = ctx.parseArgs(ptr, len);
  // args.slot, args.serviceId, args.argsLength

  const gas = ctx.checkpoint();          // i64 — commit state, return remaining gas
  ctx.yieldResult(Bytes32.zero());       // provide accumulation result hash
  return ctx.yieldHash(null);
}
```

## AccumulateFetcher

Fetches context data (fetch kinds 0-1, 14-15): protocol constants, entropy,
and accumulate items (operands and transfers).

```typescript
import { AccumulateFetcher } from "@fluffylabs/as-lan";

const fetcher = AccumulateFetcher.create();
const items = fetcher.allTransfersAndOperands();
const one = fetcher.oneTransferOrOperand(0);  // Optional<AccumulateItem>
```

## AccumulatePreimages

Extends base `Preimages` with preimage lifecycle management (ecalli 22-26).

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
