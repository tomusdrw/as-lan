// AS-side wrappers for configuring test ecalli stubs.
//
// These static classes provide a high-level API for AssemblyScript test code
// to configure the stub behavior at runtime (e.g. TestGas.set(500) changes
// the value returned by the gas() ecalli).
//
// Each class bridges to the JS-side stub implementation in sdk-ecalli-mocks/
// via @external("ecalli", ...) WASM imports. For example, TestGas.set()
// calls setGasValue() exported by sdk-ecalli-mocks/src/gas.ts.

export { TestAccumulate } from "./accumulate";
export { TestExportSegment } from "./export-segment";
export { TestGas } from "./gas";
export { TestFetch } from "./fetch";
export { TestHistoricalLookup } from "./historical-lookup";
export { TestInfo } from "./info";
export { TestLookup } from "./lookup";
export { TestPreimages } from "./preimages";
export { TestMachine } from "./machines";
export { TestStorage } from "./storage";

// @ts-expect-error: decorator
@external("ecalli", "resetAll")
declare function _resetAll(): void;

/** Top-level test ecalli utilities. */
export class TestEcalli {
  /** Reset all test ecalli configuration to defaults and clear storage. */
  static reset(): void {
    _resetAll();
  }
}
