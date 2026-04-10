# Authorize

Wrappers available during the `is_authorized` entry point.

## AuthorizeContext

Parses the core index from raw arguments.

```typescript
import { AuthorizeContext } from "@fluffylabs/as-lan";

export function is_authorized(ptr: u32, len: u32): u64 {
  const ctx = AuthorizeContext.create();
  const coreIndex = ctx.parseCoreIndex(ptr, len);  // CoreIndex (u16)
  // ...
}
```

## AuthorizeFetcher

Fetches context data (fetch kinds 0, 7-13): protocol constants, work package,
auth config, auth token, and work item payloads.

```typescript
import { AuthorizeFetcher } from "@fluffylabs/as-lan";

const fetcher = AuthorizeFetcher.create();
const config = fetcher.authConfig();
const token = fetcher.authToken();
const wp = fetcher.workPackage();
```
