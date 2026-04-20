# Testing

The SDK provides a test framework for writing and running AssemblyScript tests
against your JAM service, with configurable ecalli host call mocks.

## Architecture

Testing involves two layers that work together:

```text
┌─────────────────────────────────────┐
│  AssemblyScript test code (WASM)    │
│                                     │
│  ┌───────────┐  ┌────────────────┐  │
│  │ Your test │  │ SDK test utils │  │
│  │ assertions│  │ TestGas, etc.  │  │
│  └───────────┘  └───────┬────────┘  │
│                         │           │
│         @external("ecalli", ...)    │
└─────────────────────────┼───────────┘
                          │ WASM imports
┌─────────────────────────┼───────────┐
│  sdk-ecalli-mocks (Node.js)         │
│                                     │
│  Stub implementations of ecalli     │
│  host calls + configuration state   │
└─────────────────────────────────────┘
```

- **`sdk-ecalli-mocks/`** — A TypeScript (Node.js) package that provides stub
  implementations of all 27 ecalli host calls (general 0-5 + 100, refine 6-13,
  accumulate 14-26). These stubs satisfy the WASM imports at test time and hold
  configurable state (gas value, storage map, preimage data, etc.).

- **`sdk/test/test-ecalli/`** — AssemblyScript wrapper classes (`TestGas`,
  `TestFetch`, `TestLookup`, `TestStorage`, `TestEcalli`) that bridge to the
  JS-side stubs via `@external("ecalli", ...)` WASM imports. These give your
  AS test code a high-level API for configuring stub behavior.

## Writing Tests

### Test structure

Tests use the `test()` helper and `Assert` class from the SDK:

```typescript
import { Assert, Test, test } from "@fluffylabs/as-lan/test";

export const TESTS: Test[] = [
  test("my feature works", () => {
    const assert = Assert.create();
    assert.isEqual(1 + 1, 2, "basic math");
    return assert;
  }),
];
```

Each test function returns an `Assert` instance. Use `assert.isEqual(actual, expected, msg)`
to add assertions — any failure is recorded and reported after the test completes.

### Test runner

Each service needs a `test-run.ts` entry point that registers test suites:

```typescript
import { TestSuite, runTestSuites } from "@fluffylabs/as-lan/test";
import * as myTests from "./index.test";

export function runAllTests(): void {
  runTestSuites([TestSuite.create(myTests.TESTS, "my-service.ts")]);
}
```

And a `bin/test.js` that boots the WASM and runs:

```javascript
import { setMemory } from "ecalli";
import { memory, runAllTests } from "../build/test.js";

setMemory(memory);
runAllTests();
```

### Build and run

```bash
npm test   # compiles test target and runs bin/test.js
```

This compiles your test-run entry point to WASM (with the `test` target from
`asconfig.json`), then executes it in Node.js with the ecalli stubs providing
host call implementations.

## Configuring Ecalli Mocks

By default the stubs provide sensible test values (e.g. `gas()` returns
`1_000_000`, `lookup()` returns `"test-preimage"`, `read()`/`write()` use an
in-memory Map). You can override these from within your AS test code.

### TestGas

Set the value returned by the `gas()` ecalli:

```typescript
import { TestGas } from "@fluffylabs/as-lan/test";

TestGas.set(500);  // gas() will now return 500
```

### TestFetch

Set fixed data returned by the `fetch()` ecalli (overrides the default
kind-dependent pattern):

```typescript
import { TestFetch } from "@fluffylabs/as-lan/test";

const data = new Uint8Array(4);
data[0] = 0xde; data[1] = 0xad; data[2] = 0xbe; data[3] = 0xef;
TestFetch.setData(data);
```

### TestLookup

Set the preimage returned by the `lookup()` ecalli:

```typescript
import { TestLookup } from "@fluffylabs/as-lan/test";

const preimage = new Uint8Array(3);
preimage[0] = 1; preimage[1] = 2; preimage[2] = 3;
TestLookup.setPreimage(preimage);

// Make lookup return NONE (preimage not found)
TestLookup.setNone();
```

#### Simulating extrinsic-driven preimage delivery

In production, preimages arrive out-of-band via the `xtpreimages` block
extrinsic and CE 142 gossip — a service that only calls `solicit()` (never
`provide()`) still sees the preimage become available once the network
delivers it. To exercise that path in tests without modeling block
inclusion, attach the preimage directly to the `lookup()` mock:

```typescript
import { Bytes32, BytesBlob } from "@fluffylabs/as-lan";
import { TestLookup } from "@fluffylabs/as-lan/test";

// After this call, any lookup(hash) ecalli returns `preimage`.
TestLookup.setAttachedPreimage(
  Bytes32.wrapUnchecked(hashBytes),
  BytesBlob.wrap(preimageBytes),
);

// Clear all attached preimages (keeps the single-preimage fallback).
TestLookup.clearAttachedPreimages();
```

Attached entries take precedence over `setPreimage` / `setNone`. Both
`TestEcalli.reset()` and any `resetPreimages`/`resetLookup` path clear
the attached map, so tests starting with `TestEcalli.reset()` never see
leaked attachments from a prior test.

Good reference: the `pastebin` example's `"paste → solicit → attach → lookup
retrieves blob"` test exercises the full flow end-to-end.

### TestHistoricalLookup

Set the preimage returned by the `historical_lookup()` ecalli (refine context):

```typescript
import { TestHistoricalLookup } from "@fluffylabs/as-lan/test";

TestHistoricalLookup.setPreimage(data);

// Make historical_lookup return NONE
TestHistoricalLookup.setNone();
```

### TestPreimages

Configure accumulate-context preimage ecalli stubs (query, solicit, forget, provide):

```typescript
import { TestPreimages } from "@fluffylabs/as-lan/test";
import { EcalliResult } from "@fluffylabs/as-lan";

// Configure query to return "Available" with slot0=42:
// r7 = (slot0 << 32) | kind, r8 = (slot2 << 32) | slot1
TestPreimages.setQueryResult(i64((u64(42) << 32) | 1), 0);

// Configure query to return NONE (not solicited)
TestPreimages.setQueryResult(-1);

// Configure solicit to return an error
TestPreimages.setSolicitResult(EcalliResult.HUH);

// Configure forget to return OK
TestPreimages.setForgetResult(0);

// Configure provide to return WHO error
TestPreimages.setProvideResult(EcalliResult.WHO);
```

### TestExportSegment

Override the `export_segment()` ecalli return value (refine context):

```typescript
import { TestExportSegment } from "@fluffylabs/as-lan/test";
import { EcalliResult } from "@fluffylabs/as-lan";

// Make export_segment return FULL (segment limit reached)
TestExportSegment.setResult(EcalliResult.FULL);
```

By default, `export_segment()` returns an auto-incrementing segment index (0, 1, 2, …).
Use `TestEcalli.reset()` to restore the default behavior.

### TestMachine

Configure machine ecalli stub return values (refine context, ecalli 8-13):

```typescript
import { TestMachine } from "@fluffylabs/as-lan/test";
import { EcalliResult } from "@fluffylabs/as-lan";

// Make machine() return HUH (invalid entrypoint)
TestMachine.setMachineResult(EcalliResult.HUH);

// Make peek() return OOB
TestMachine.setPeekResult(EcalliResult.OOB);

// Make poke() return OOB
TestMachine.setPokeResult(EcalliResult.OOB);

// Make invoke() return Host (3) with host call index 12 in r8
TestMachine.setInvokeResult(3, 12);

// Make expunge() return a specific hash
TestMachine.setExpungeResult(0x42);
```

By default, `machine()` returns incrementing IDs, `invoke()` returns HALT, and
all other operations return OK. Use `TestEcalli.reset()` to restore defaults.

### TestStorage

Pre-populate or delete entries in the `read()`/`write()` stub storage:

```typescript
import { BytesBlob } from "@fluffylabs/as-lan";
import { TestStorage } from "@fluffylabs/as-lan/test";

// Pre-populate a key
const key = BytesBlob.encodeAscii("counter");
const value = BytesBlob.wrap(new Uint8Array(8));
TestStorage.set(key, value);

// Delete a key
TestStorage.set(key, null);
```

### TestPrivileged

Configure the return values of privileged governance ecallis (bless, assign, designate):

```typescript
import { TestPrivileged } from "@fluffylabs/as-lan/test";
import { EcalliResult } from "@fluffylabs/as-lan";

TestPrivileged.setBlessResult(EcalliResult.WHO);
TestPrivileged.setAssignResult(EcalliResult.CORE);
TestPrivileged.setDesignateResult(EcalliResult.HUH);
```

### TestServices

Configure the return values of service lifecycle ecallis (new_service, eject):

```typescript
import { TestServices } from "@fluffylabs/as-lan/test";
import { EcalliResult } from "@fluffylabs/as-lan";

TestServices.setNewServiceResult(EcalliResult.CASH);
TestServices.setEjectResult(EcalliResult.WHO);
```

By default, `new_service()` returns auto-incrementing service IDs (256, 257, ...).
Setting a result overrides this behavior until reset.

### TestTransfer

Configure the return value of the `transfer()` ecalli:

```typescript
import { TestTransfer } from "@fluffylabs/as-lan/test";
import { EcalliResult } from "@fluffylabs/as-lan";

TestTransfer.setTransferResult(EcalliResult.CASH);
```

### TestEcalli

Reset all configuration to defaults and clear storage:

```typescript
import { TestEcalli } from "@fluffylabs/as-lan/test";

TestEcalli.reset();
```

## Default Stub Behavior

**General (0-5, 100):**

| Ecalli | Default |
|--------|---------|
| `gas()` | Returns `1_000_000` |
| `fetch()` | Writes a 16-byte kind-dependent pattern, returns `16` |
| `lookup()` | Writes `"test-preimage"` (13 bytes), returns `13` |
| `read()` | Reads from in-memory Map; returns `NONE` (`-1`) if key missing |
| `write()` | Writes to in-memory Map; returns previous value length or `NONE` |
| `info()` | Returns a 96-byte structure (code\_hash=`0xAA...`, balance=`1000`) |
| `log()` | Prints `[LEVEL] target: message` to console |

**Refine (6-13):**

| Ecalli | Default |
|--------|---------|
| `historical_lookup()` | Writes `"test-historical"` (15 bytes), returns `15` |
| `export_segment()` | Returns incrementing segment index (0, 1, 2, ...) |
| `machine()` | Returns incrementing machine ID (0, 1, 2, ...) |
| `peek()` | Returns `OK` (0) |
| `poke()` | Returns `OK` (0) |
| `pages()` | Returns `OK` (0) |
| `invoke()` | Returns `HALT` (0), writes `r8 = 0` |
| `expunge()` | Returns `OK` (0) |

**Accumulate (14-26):**

| Ecalli | Default |
|--------|---------|
| `bless()` | Returns `OK` (0) |
| `assign()` | Returns `OK` (0) |
| `designate()` | Returns `OK` (0) |
| `checkpoint()` | Returns remaining gas (delegates to `gas()` mock) |
| `new_service()` | Returns incrementing service ID (256, 257, ...) |
| `upgrade()` | Returns `OK` (0) |
| `transfer()` | Returns `OK` (0) |
| `eject()` | Returns `OK` (0) |
| `query()` | Returns `NONE` (-1), writes `r8 = 0` |
| `solicit()` | Returns `OK` (0) |
| `forget()` | Returns `OK` (0) |
| `yield_result()` | Returns `OK` (0) |
| `provide()` | Returns `OK` (0) |


See the [fibonacci](https://github.com/fluffylabs/as-lan/tree/main/examples/fibonacci)
and [ecalli-test](https://github.com/fluffylabs/as-lan/tree/main/examples/ecalli-test)
examples for usage examples.
