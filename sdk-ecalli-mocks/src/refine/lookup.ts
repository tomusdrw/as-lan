// Ecalli 6: historical_lookup — same pattern as general lookup.

import { writeToMem } from "../memory.js";

const DEFAULT_HISTORICAL_PREIMAGE = new TextEncoder().encode("test-historical");

let historicalPreimage: Uint8Array = DEFAULT_HISTORICAL_PREIMAGE;

export function setHistoricalLookupPreimage(data: Uint8Array): void {
  historicalPreimage = data;
}

export function historical_lookup(
  _service: number,
  _hash_ptr: number,
  out_ptr: number,
  offset: number,
  length: number,
): bigint {
  writeToMem(out_ptr, historicalPreimage, offset, length);
  return BigInt(historicalPreimage.length);
}

export function resetHistoricalLookup(): void {
  historicalPreimage = DEFAULT_HISTORICAL_PREIMAGE;
}
