# Pastebin example

Open-submission pastebin service. Anyone submits a blob; the service
Blake2b-256-hashes it in refine, solicits the preimage in accumulate, and
expires pastes after `TTL_SLOTS` slots.

## Design

- **Refine**: Blake2b-256 the full payload, emit `hash ‖ length_LE` as the
  operand `okBlob` (36 bytes total).
- **Accumulate**: idempotent insert — skip if `paste:<hash>` already exists;
  otherwise `solicit(hash, length)`, write `PasteEntry` metadata, push to
  the `recent:` ring buffer, and append the hash to the `expiry:<slot+TTL>`
  bucket. Cleanup runs once per invocation and walks up to
  `CLEANUP_SLOTS_PER_CALL` expiry buckets forward from `meta:cleanup_cursor`,
  forgetting expired pastes and deleting their metadata.
- **Preimage delivery**: out-of-band via the `xtpreimages` block extrinsic
  plus CE 142 gossip. The service never calls `provide`.
- **Self-authorizing dispatch**: `index.ts` routes on input length —
  `len === 2` → `is_authorized`, else `refine`.

## Storage layout

| Key | Value |
|---|---|
| `paste:<32-byte hash>` | `PasteEntry` (8 bytes: slot u32 LE ‖ length u32 LE) |
| `recent:<u32 LE idx>` | Ring-buffer entry: `hash ‖ slot_LE` (36 bytes), `idx = head mod RECENT_N` |
| `expiry:<u32 LE slot>` | Packed 32-byte hashes scheduled to expire at `slot` |
| `meta:recent_head` | Ring-buffer head counter (u32 LE) |
| `meta:cleanup_cursor` | Highest slot whose expiry bucket has been swept (u32 LE) |

Constants live in `assembly/constants.ts`: `TTL_SLOTS = 1000`, `RECENT_N = 32`,
`CLEANUP_SLOTS_PER_CALL = 8`.

## Build + test

```bash
npm install
npm run build      # debug + release + PVM
npm test
```

`npm test` runs the AS test harness: 3 Blake2b RFC vectors + 6 pastebin
integration tests (refine output, accumulate insertion, idempotent
re-submission, TTL cleanup, end-to-end solicit→attach→lookup).

## Limitations (v1)

- **No authentication**: anyone can submit. The service pays all storage
  costs.
- **No rate limit**: a flood can fill the recent-ring buffer in 32 slots.
- **First-writer-wins idempotency**: re-submitting the same hash silently
  preserves the original slot rather than refreshing the TTL.
- **Blake2b is a pure-AS reference implementation**: tuned for wasm size
  but not runtime cost. If a second service also consumes it, graduate into
  `sdk/core/crypto/blake2b.ts`.

See `docs/superpowers/specs/2026-04-19-token-and-pastebin-examples-design.md`
(Section C) for full design rationale.
