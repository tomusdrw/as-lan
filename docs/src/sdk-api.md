# SDK API

The SDK API is organized by invocation context — each page documents the
wrappers available during that entry point.

- [Common](./sdk-api/common.md) — available in all contexts (ServiceData, Preimages)
- [Refine](./sdk-api/refine.md) — RefineContext, RefineFetcher, RefinePreimages, Machine
- [Accumulate](./sdk-api/accumulate.md) — AccumulateContext, AccumulateFetcher, AccumulatePreimages
- [Authorize](./sdk-api/authorize.md) — AuthorizeContext, AuthorizeFetcher
- [Utilities](./sdk-api/utilities.md) — Logger, LogMsg, ByteBuf, Decoder, Byte Types
- [Host Calls (ecalli)](./sdk-api/ecalli.md) — raw host call reference table

## Example services

Each example in `examples/` is a self-contained service that exercises a
particular slice of the SDK. Browse the source for end-to-end patterns.

- **[fibonacci](https://github.com/fluffylabs/as-lan/tree/main/examples/fibonacci)**
  — minimal refine + accumulate, starter template.
- **[authorizer](https://github.com/fluffylabs/as-lan/tree/main/examples/authorizer)**
  — standalone `is_authorized` service with gating logic.
- **[ecalli-test](https://github.com/fluffylabs/as-lan/tree/main/examples/ecalli-test)**
  — dispatches every ecalli host call for smoke-testing the SDK surface.
- **[pastebin](https://github.com/fluffylabs/as-lan/tree/main/examples/pastebin)**
  — open-submission paste service. Refine hashes the payload with
  Blake2b-256; accumulate solicits the preimage and records metadata in a
  storage-backed ring buffer plus a slot-bucketed TTL index. Preimage bytes
  arrive via the `xtpreimages` block extrinsic — accumulate never calls
  `provide`. Good reference for the solicit-only preimage lifecycle and
  slot-bucket cleanup patterns.
