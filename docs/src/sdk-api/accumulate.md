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

  // Schedule a transfer (executes after accumulation completes)
  const r1 = ctx.scheduleTransfer(42, 1000, 100);  // ResultN<bool, TransferError>

  // Transfer with explicit memo
  const memo = Memo.create(BytesBlob.encodeAscii("hello"));
  const r2 = ctx.scheduleTransfer(42, 1000, 100, memo);

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

## Admin (Privileged Governance)

High-level wrappers for ecallis 14-16 (`bless`, `assign`, `designate`). Only
callable by privileged services (manager, delegator, registrar, core assigners).

```typescript
import {
  Admin, AutoAccumulateEntry, ValidatorKey,
  Bytes32, BytesBlob,
} from "@fluffylabs/as-lan";

const admin = Admin.create();

// Full bless — only the manager can set all fields
admin.bless(
  managerServiceId,
  [assigner1, assigner2],       // one ServiceId per core
  delegatorServiceId,
  registrarServiceId,
  [AutoAccumulateEntry.create(100, 5000)],
);  // ResultN<bool, BlessError>

// Partial bless — delegator/registrar can transfer their own role
admin.blessDelegator(newDelegatorId);   // ResultN<bool, BlessError>
admin.blessRegistrar(newRegistrarId);   // ResultN<bool, BlessError>

// Assign auth queue for a core (only that core's assigner)
admin.assign(coreIndex, [codeHash1, codeHash2]);  // ResultN<bool, AssignError>

// Transfer assigner permission to another service
admin.assign(coreIndex, authQueue, newAssignerServiceId);

// Designate next epoch validators
const key = ValidatorKey.create(ed25519, bandersnatch, bls, metadata);
admin.designate([key]);  // ResultN<bool, DesignateError>
```

## Child Services

Create and eject child services (ecallis 18, 21).

```typescript
import { ChildServices, Bytes32 } from "@fluffylabs/as-lan";

const cs = ChildServices.create();

// Create a child service
const result = cs.newChild(codeHash, codeLen, gas, allowance);
// ResultN<ServiceId, NewChildError>
if (result.isOkay) {
  const childId = result.okay;  // the new ServiceId
}

// Eject a child service (it must have called requestEjection first)
cs.ejectChild(childServiceId, prevCodeHash);  // ResultN<bool, EjectChildError>
```

## Self-Service

Upgrade the current service's code or request ejection (ecalli 19).

```typescript
import { SelfService, Bytes32 } from "@fluffylabs/as-lan";

const self = SelfService.create();

// Upgrade to new code (ensure preimage is available first!)
self.upgradeCode(newCodeHash, minGas, allowance);

// Request ejection by a parent service
// WARNING: clear all storage before calling this!
self.requestEjection(parentServiceId);
```
