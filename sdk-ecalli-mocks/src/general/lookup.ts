import { readBytes, writeToMem } from "../memory.js";

const DEFAULT_PREIMAGE = new TextEncoder().encode("test-preimage");

let lookupPreimage: Uint8Array | null = DEFAULT_PREIMAGE;

// Attached preimages map: hex-encoded 32-byte hash → blob bytes.
// Populated by the AS-side TestPreimages.setAttachedPreimage helper.
// Simulates preimages arriving via the xtpreimages block extrinsic.
const attached: Map<string, Uint8Array> = new Map();

/** Internal: store an attached preimage keyed by hex hash. Not a public API. */
export function _setAttached(hashHex: string, bytes: Uint8Array): void {
  attached.set(hashHex, bytes);
}

/** Internal: clear all attached preimages. Not a public API. */
export function _clearAttached(): void {
  attached.clear();
}

export function setLookupPreimage(ptr: number, len: number): void {
  lookupPreimage = readBytes(ptr, len);
}

/** Configure lookup to return NONE (preimage not found). */
export function setLookupNone(): void {
  lookupPreimage = null;
}

function toHex(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 1) {
    const b = bytes[i];
    s += (b < 16 ? "0" : "") + b.toString(16);
  }
  return s;
}

export function lookup(
  _service: number,
  hash_ptr: number,
  out_ptr: number,
  offset: number,
  length: number,
): bigint {
  // Preferred path: check attached map first (simulates extrinsic delivery).
  const hashBytes = readBytes(hash_ptr, 32);
  const hex = toHex(hashBytes);
  const hit = attached.get(hex);
  if (hit !== undefined) {
    writeToMem(out_ptr, hit, offset, length);
    return BigInt(hit.length);
  }

  // Fallback: the existing single-preimage slot.
  if (lookupPreimage === null) return -1n; // NONE
  writeToMem(out_ptr, lookupPreimage, offset, length);
  return BigInt(lookupPreimage.length);
}

export function resetLookup(): void {
  lookupPreimage = DEFAULT_PREIMAGE;
  attached.clear();
}
