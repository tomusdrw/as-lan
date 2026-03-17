// Ecalli 6: historical_lookup — same pattern as general lookup.
import { writeToMem } from "../memory.js";
const DEFAULT_HISTORICAL_PREIMAGE = new TextEncoder().encode("test-historical");
let historicalPreimage = DEFAULT_HISTORICAL_PREIMAGE;
export function setHistoricalLookupPreimage(data) {
    historicalPreimage = data;
}
export function historical_lookup(_service, _hash_ptr, out_ptr, offset, length) {
    writeToMem(out_ptr, historicalPreimage, offset, length);
    return BigInt(historicalPreimage.length);
}
export function resetHistoricalLookup() {
    historicalPreimage = DEFAULT_HISTORICAL_PREIMAGE;
}
