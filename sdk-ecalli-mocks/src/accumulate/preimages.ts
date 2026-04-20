// Ecalli 22-26: Preimage management operations.
//
// query (22), solicit (23), forget (24), yield_result (25), provide (26)
// — manage preimage availability and solicitation.

import { _clearAttached, _setAttached } from "../general/lookup.js";
import { readBytes, writeI64 } from "../memory.js";

// ─── Configurable state ──────────────────────────────────────────────────

let queryR7: bigint = -1n; // NONE by default
let queryR8: bigint = 0n;
let solicitResult: bigint = 0n; // OK
let forgetResult: bigint = 0n; // OK
let provideResult: bigint = 0n; // OK

let solicitCount = 0;
let forgetCount = 0;
let provideCount = 0;

/** Configure the query ecalli return values (r7, r8). */
export function setQueryResult(r7: bigint, r8: bigint): void {
  queryR7 = r7;
  queryR8 = r8;
}

/** Configure the solicit ecalli return value. */
export function setSolicitResult(result: bigint): void {
  solicitResult = result;
}

/** Configure the forget ecalli return value. */
export function setForgetResult(result: bigint): void {
  forgetResult = result;
}

/** Configure the provide ecalli return value. */
export function setProvideResult(result: bigint): void {
  provideResult = result;
}

export function getSolicitCount(): bigint {
  return BigInt(solicitCount);
}

export function getForgetCount(): bigint {
  return BigInt(forgetCount);
}

export function getProvideCount(): bigint {
  return BigInt(provideCount);
}

export function resetPreimageCounters(): void {
  solicitCount = 0;
  forgetCount = 0;
  provideCount = 0;
}

/**
 * Simulate a preimage arriving via the `xtpreimages` block extrinsic.
 *
 * Called from AS tests. After this call, any `lookup(hash)` ecalli for the
 * given hash returns `preimage`, regardless of the service id. The default
 * test-preimage fallback still applies for unattached hashes.
 */
export function setPreimageAttached(
  hash_ptr: number,
  preimage_ptr: number,
  preimage_len: number,
): void {
  const hashBytes = readBytes(hash_ptr, 32);
  const preimage = readBytes(preimage_ptr, preimage_len);
  let hex = "";
  for (let i = 0; i < 32; i += 1) {
    const b = hashBytes[i];
    hex += (b < 16 ? "0" : "") + b.toString(16);
  }
  _setAttached(hex, preimage);
}

/** Clear all attached preimages (but not the default test-preimage fallback). */
export function clearPreimageAttachments(): void {
  _clearAttached();
}

export function resetPreimages(): void {
  queryR7 = -1n;
  queryR8 = 0n;
  solicitResult = 0n;
  forgetResult = 0n;
  provideResult = 0n;
  solicitCount = 0;
  forgetCount = 0;
  provideCount = 0;
  _clearAttached();
}

// ─── Ecalli stubs ────────────────────────────────────────────────────────

/** Ecalli 22: Query preimage status. */
export function query(
  _hash_ptr: number,
  _length: number,
  out_r8: number,
): bigint {
  writeI64(out_r8, queryR8);
  return queryR7;
}

/** Ecalli 23: Solicit preimage — returns configured result. */
export function solicit(
  _hash_ptr: number,
  _length: number,
): bigint {
  solicitCount++;
  return solicitResult;
}

/** Ecalli 24: Forget preimage solicitation — returns configured result. */
export function forget(
  _hash_ptr: number,
  _length: number,
): bigint {
  forgetCount++;
  return forgetResult;
}

/** Ecalli 25: Yield accumulation result hash — returns OK. */
export function yield_result(
  _hash_ptr: number,
): bigint {
  return 0n; // OK
}

/** Ecalli 26: Provide preimage for solicited hash — returns configured result. */
export function provide(
  _service: number,
  _preimage_ptr: number,
  _preimage_len: number,
): bigint {
  provideCount++;
  return provideResult;
}
