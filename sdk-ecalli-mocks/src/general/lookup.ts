import { readBytes, writeToMem } from "../memory.js";

const DEFAULT_PREIMAGE = new TextEncoder().encode("test-preimage");

let lookupPreimage: Uint8Array | null = DEFAULT_PREIMAGE;

// Attached preimages map: hex-encoded 32-byte hash → blob bytes.
// Populated by the AS-side TestLookup.setAttachedPreimage helper.
// Simulates preimages arriving via the xtpreimages block extrinsic.
const attached: Map<string, Uint8Array> = new Map();

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

/**
 * Simulate a preimage arriving via the `xtpreimages` block extrinsic.
 *
 * Called from AS tests via the `TestLookup.setAttachedPreimage` wrapper.
 * After this call, any `lookup(hash)` ecalli for the given hash returns
 * `preimage`, regardless of the service id. The default single-preimage
 * fallback (configured by setLookupPreimage / setLookupNone) still applies
 * for unattached hashes.
 */
export function setPreimageAttached(
  hash_ptr: number,
  preimage_ptr: number,
  preimage_len: number,
): void {
  const hashBytes = readBytes(hash_ptr, 32);
  if (hashBytes.length !== 32) throw new Error("setPreimageAttached: hash must be 32 bytes");
  const preimage = readBytes(preimage_ptr, preimage_len);
  attached.set(toHex(hashBytes), preimage);
}

/** Clear all attached preimages (but not the default single-preimage fallback). */
export function clearPreimageAttachments(): void {
  attached.clear();
}

export function lookup(
  _service: number,
  hash_ptr: number,
  out_ptr: number,
  offset: number,
  length: number,
): bigint {
  // Preferred path: check attached map first (simulates extrinsic delivery).
  if (attached.size > 0) {
    const hit = attached.get(toHex(readBytes(hash_ptr, 32)));
    if (hit !== undefined) {
      writeToMem(out_ptr, hit, offset, length);
      return BigInt(hit.length);
    }
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
