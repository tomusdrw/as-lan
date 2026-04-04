// Configurable ecalli host call stubs for testing JAM services.
//
// This package provides the **JS-side** (Node.js) stub implementations that
// satisfy WASM ecalli imports at test time. Each ecalli function has its own
// module with a stub and optional configuration (e.g. setGasValue, setFetchData).
//
// The corresponding **AS-side** wrappers live in sdk/test/test-ecalli/.

// Setup
export { setMemory } from "./memory.js";

// General ecalli stubs (0-5, 100)
export { gas, setGasValue } from "./general/index.js";
export {
  fetch, setFetchData, setFetchDataForKind, setAccumulateItems, setAccumulateItem,
  encodeOperand, encodeTransfer,
} from "./general/index.js";
export { lookup, setLookupPreimage } from "./general/index.js";
export { read, write, setStorageEntry } from "./general/index.js";
export { info, setInfoData, setDefaultInfoData } from "./general/index.js";
export { log } from "./general/index.js";

// Refine ecalli stubs (6-13)
export { historical_lookup, setHistoricalLookupPreimage } from "./refine/index.js";
export { export_ as export } from "./refine/index.js";
export { machine, peek, poke, pages, invoke, expunge } from "./refine/index.js";

// Accumulate ecalli stubs (14-26)
export { bless, assign, designate } from "./accumulate/index.js";
export { checkpoint } from "./accumulate/index.js";
export { new_service, upgrade, eject } from "./accumulate/index.js";
export { transfer } from "./accumulate/index.js";
export { query, solicit, forget, yield_result, provide } from "./accumulate/index.js";

// Reset
import { resetGeneral } from "./general/index.js";
import { resetRefine } from "./refine/index.js";
import { resetAccumulate } from "./accumulate/index.js";

export function resetAll(): void {
  resetGeneral();
  resetRefine();
  resetAccumulate();
}
