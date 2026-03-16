// Configurable ecalli host call stubs for testing JAM services.
//
// This package provides the **JS-side** (Node.js) stub implementations that
// satisfy WASM ecalli imports at test time. Each ecalli function (gas, fetch,
// lookup, read, write, info, log) has its own module with a stub and an
// optional configuration function (e.g. setGasValue, setFetchData).
//
// The corresponding **AS-side** wrappers live in sdk/test/test-ecalli/.
// Those wrappers (TestGas, TestFetch, TestLookup, TestStorage, TestEcalli)
// provide a high-level API for configuring stubs from within AssemblyScript
// test code. They bridge to this package via @external("ecalli", ...) WASM
// imports — e.g. TestGas.set(v) calls setGasValue(v) here.
// Setup
export { setMemory } from "./memory.js";
// Ecalli stubs
export { gas, setGasValue } from "./gas.js";
export { fetch, setFetchData } from "./fetch.js";
export { lookup, setLookupPreimage } from "./lookup.js";
export { read, write, setStorageEntry } from "./storage.js";
export { info } from "./info.js";
export { log } from "./log.js";
// Reset
import { resetGas } from "./gas.js";
import { resetFetch } from "./fetch.js";
import { resetInfo } from "./info.js";
import { resetLookup } from "./lookup.js";
import { resetStorage } from "./storage.js";
export function resetAll() {
    resetGas();
    resetFetch();
    resetLookup();
    resetStorage();
    resetInfo();
}
