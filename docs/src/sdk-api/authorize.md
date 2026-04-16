# Authorize

Wrappers available during the `is_authorized` entry point.

## AuthorizeContext

Parses the core index from raw arguments.
It also serves as the entry point for creating all authorize-context helpers
via factory methods — **prefer `ctx.*()` over standalone `*.create()`**.

```typescript
import { AuthorizeContext } from "@fluffylabs/as-lan";

export function is_authorized(ptr: u32, len: u32): u64 {
  const ctx = AuthorizeContext.create();
  const coreIndex = ctx.parseCoreIndex(ptr, len);  // CoreIndex (u16)

  const gasLeft = ctx.remainingGas();  // i64 — ecalli 0

  const fetcher = ctx.fetcher();       // AuthorizeFetcher
  const preimages = ctx.preimages();   // Preimages (lookup only)
  const storage = ctx.serviceData();   // CurrentServiceData
  // ...
}
```

**`ctx.remainingGas()`** — return the remaining gas (ecalli 0).

**`ctx.fetcher(bufSize?)`** — create an `AuthorizeFetcher` (fetch kinds 0, 7-13).

**`ctx.preimages(bufSize?)`** — create a `Preimages` helper (lookup only — no historical or lifecycle ops).

**`ctx.serviceData(bufSize?)`** — create a `CurrentServiceData` helper for storage read/write.

## AuthorizeFetcher

Fetches context data (fetch kinds 0, 7-13): protocol constants, work package,
auth config, auth token, and work item payloads.

```typescript
const fetcher = ctx.fetcher();
const config = fetcher.authConfig();
const token = fetcher.authToken();
const wp = fetcher.workPackage();
```
