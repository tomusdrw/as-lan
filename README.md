# as-lan

JAM stuff in AssemblyScript.

## ABI (WIP)

This module currently exports two entrypoints:

- `refine_ext(inData: Uint8Array): Uint8Array`
- `accumulate_ext(inData: Uint8Array): Uint8Array`

### `refine_ext` input layout

The input payload is SCALE-like decoded in this order:

1. `serviceId: u32` (little-endian)
2. `payload: BytesBlob` (var-len encoded length + raw bytes)
3. `packageInfo: PackageInfo`
4. `extrinsics: Vec<BytesBlob>`

Output is raw `WorkOutput` bytes from `service.refine(...)`.

### `accumulate_ext` input layout

The input payload is decoded in this order:

1. `slot: u32` (little-endian)
2. `serviceId: u32` (little-endian)
3. `results: Vec<AccumulateItem>`

Output encoding (`Optional<CodeHash>`) is explicit:

- `0x00` for `None`
- `0x01 || <32-byte hash>` for `Some(CodeHash)`

## Run Examples

- `npm run example:refine`
- `npm run example:accumulate`

These commands build release WASM and run host-side scripts in `bin/` that print:

- encoded input bytes
- decoded semantic fields used by the example
- raw output bytes
