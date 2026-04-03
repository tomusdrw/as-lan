// General ecalli mock stubs (0-5, 100).

export { gas, setGasValue, resetGas } from "./gas.js";
export {
  fetch, setFetchData, setAccumulateItems, setAccumulateItem,
  encodeOperand, encodeTransfer, resetFetch,
} from "./fetch.js";
export { lookup, setLookupPreimage, resetLookup } from "./lookup.js";
export { read, write, setStorageEntry, resetStorage } from "./storage.js";
export { info, setInfoData, setDefaultInfoData, resetInfo } from "./info.js";
export { log } from "./log.js";

import { resetGas } from "./gas.js";
import { resetFetch } from "./fetch.js";
import { resetInfo } from "./info.js";
import { resetLookup } from "./lookup.js";
import { resetStorage } from "./storage.js";

export function resetGeneral(): void {
  resetGas();
  resetFetch();
  resetLookup();
  resetStorage();
  resetInfo();
}
