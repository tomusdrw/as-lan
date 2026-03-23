# as-lan

AssemblyScript SDK for building [JAM](https://graypaper.com/) services.

**[Full Documentation](https://todr.me/as-lan/)**

## Prerequisites

- [Node.js](https://nodejs.org/) (v22+)
- [wasm-pvm-cli](https://crates.io/crates/wasm-pvm-cli) — compiles WASM to JAM PVM binaries

  ```bash
  cargo install wasm-pvm-cli@0.7.0
  ```

## Quick Start

Scaffold a new service project with one command:

```bash
curl -sL https://todr.me/as-lan/start.sh | bash -s my-service
cd my-service
npm run build
```

This creates basic project with the SDK wired up as a git submodule. Edit `assembly/service.ts` to implement your service logic.

See the [Getting Started guide](https://todr.me/as-lan/getting-started.html) for details on what gets generated and next steps.

## Development

```bash
# Install dependencies
npm install

# Build the fibonacci example (WASM + PVM)
npm run build

# Run tests (SDK + example)
npm test

# Lint & format
npm run qa
npm run qa-fix
```

The build produces both `.wasm` and `.pvm` (PolkaVM/JAM SPI binary) files in the `build/` directory of each service. The `.pvm` file is what gets deployed to JAM.

## License

MPL-2.0
