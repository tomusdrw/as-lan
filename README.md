# as-lan

AssemblyScript SDK for building [JAM](https://graypaper.com/) services.

**[Full Documentation](https://todr.me/as-lan/)**

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

# Build the fibonacci example
npm run build

# Run tests (SDK + example)
npm test

# Lint & format
npm run qa
npm run qa-fix
```

## License

MPL-2.0
