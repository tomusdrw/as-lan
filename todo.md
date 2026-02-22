# Finish Plan: Basic JAM `refine` and `accumulate` examples

## Chunk 1: ABI hardening and boundary encoding
- Document byte-level ABI for `refine_ext` and `accumulate_ext` inputs/outputs.
- Enforce strict decode checks in `assembly/sdk/index.ts`:
  - reject malformed/truncated input
  - reject trailing bytes
  - remove unchecked decode unwraps at boundary
- Implement explicit output encoding for `Optional<CodeHash>`:
  - `None` -> `0x00`
  - `Some(hash32)` -> `0x01 || <32-byte hash>`

## Chunk 2: Minimal service behavior + coverage
- Implement deterministic baseline logic for:
  - `refine(id, payload, packageInfo, extrinsics) -> WorkOutput`
  - `accumulate(slot, id, results) -> Optional<CodeHash>`
- Keep behavior simple and inspectable while matching JAM-like flow.
- Add tests for SDK path and new JAM result structures.

## Chunk 3: Runnable examples and scripts
- Add example runners under `bin/` for both entrypoints.
- Add npm scripts:
  - `example:refine`
  - `example:accumulate`
- Ensure examples print encoded input and decoded semantic output so behavior is easy to validate manually.

## Branch prep
- `c1-abi-hardening`: chunk 1
- `c2-service-tests`: chunk 2
- `c3-examples`: chunk 3
