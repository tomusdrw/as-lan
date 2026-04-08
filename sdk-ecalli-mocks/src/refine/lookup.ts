// Ecalli 6: historical_lookup — same pattern as general lookup.

import { readBytes, writeToMem } from "../memory.js";

const DEFAULT_HISTORICAL_PREIMAGE = new TextEncoder().encode("test-historical");

let historicalPreimage: Uint8Array | null = DEFAULT_HISTORICAL_PREIMAGE;

/** Configure historical_lookup from JS (takes Uint8Array directly). */
export function setHistoricalLookupPreimage(data: Uint8Array): void {
  historicalPreimage = data;
}

/** Configure historical_lookup from AS (reads bytes from WASM memory). */
export function setHistoricalPreimage(ptr: number, len: number): void {
  historicalPreimage = readBytes(ptr, len);
}

/** Configure historical_lookup to return NONE. */
export function setHistoricalLookupNone(): void {
  historicalPreimage = null;
}

export function historical_lookup(
  _service: number,
  _hash_ptr: number,
  out_ptr: number,
  offset: number,
  length: number,
): bigint {
  if (historicalPreimage === null) return -1n; // NONE
  writeToMem(out_ptr, historicalPreimage, offset, length);
  return BigInt(historicalPreimage.length);
}

export function resetHistoricalLookup(): void {
  historicalPreimage = DEFAULT_HISTORICAL_PREIMAGE;
}
