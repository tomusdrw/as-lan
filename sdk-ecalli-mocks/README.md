# @fluffylabs/as-lan-ecalli-mocks

JavaScript ecalli host-call stubs for testing [JAM](https://graypaper.com/) services built with [`@fluffylabs/as-lan`](https://www.npmjs.com/package/@fluffylabs/as-lan).

Wired as WASM imports during AssemblyScript tests to simulate the PVM runtime's host calls (`fetch`, `read`, `write`, `lookup`, `export`, `machine`, …). The export names match the `@external("ecalli", ...)` declarations in the SDK.

See the [repository README](https://github.com/tomusdrw/as-lan#readme) and [full documentation](https://todr.me/as-lan/) for usage.

## Install

```bash
npm install --save-dev @fluffylabs/as-lan @fluffylabs/as-lan-ecalli-mocks
```

## License

MPL-2.0
