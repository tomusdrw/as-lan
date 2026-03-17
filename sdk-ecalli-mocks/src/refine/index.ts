// Refine ecalli mock stubs (6-13).

export { historical_lookup, setHistoricalLookupPreimage, resetHistoricalLookup } from "./lookup.js";
export { export_, resetSegments } from "./segments.js";
export { machine, peek, poke, pages, invoke, expunge, resetMachines } from "./machines.js";

import { resetHistoricalLookup } from "./lookup.js";
import { resetSegments } from "./segments.js";
import { resetMachines } from "./machines.js";

export function resetRefine(): void {
  resetHistoricalLookup();
  resetSegments();
  resetMachines();
}
