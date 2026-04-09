// Refine ecalli mock stubs (6-13).

export {
  historical_lookup, setHistoricalLookupPreimage, setHistoricalPreimage,
  setHistoricalLookupNone, resetHistoricalLookup,
} from "./lookup.js";
export { export_segment, setExportSegmentResult, resetSegments } from "./segments.js";
export {
  machine, peek, poke, pages, invoke, expunge, resetMachines,
  setMachineResult, setPeekResult, setPokeResult, setPagesResult, setInvokeResult, setExpungeResult,
} from "./machines.js";

import { resetHistoricalLookup } from "./lookup.js";
import { resetSegments } from "./segments.js";
import { resetMachines } from "./machines.js";

export function resetRefine(): void {
  resetHistoricalLookup();
  resetSegments();
  resetMachines();
}
