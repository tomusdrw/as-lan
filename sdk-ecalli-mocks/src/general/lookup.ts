import { readBytes, writeToMem } from "../memory.js";

const DEFAULT_PREIMAGE = new TextEncoder().encode("test-preimage");

let lookupPreimage: Uint8Array | null = DEFAULT_PREIMAGE;

export function setLookupPreimage(ptr: number, len: number): void {
  lookupPreimage = readBytes(ptr, len);
}

/** Configure lookup to return NONE (preimage not found). */
export function setLookupNone(): void {
  lookupPreimage = null;
}

export function lookup(
  _service: number,
  _hash_ptr: number,
  out_ptr: number,
  offset: number,
  length: number,
): bigint {
  if (lookupPreimage === null) return -1n; // NONE
  writeToMem(out_ptr, lookupPreimage, offset, length);
  return BigInt(lookupPreimage.length);
}

export function resetLookup(): void {
  lookupPreimage = DEFAULT_PREIMAGE;
}
