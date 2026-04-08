// Ecalli 22-26: Preimage management operations.
//
// query (22), solicit (23), forget (24), yield_result (25), provide (26)
// — manage preimage availability and solicitation.

import { writeI64 } from "../memory.js";

// ─── Configurable state ──────────────────────────────────────────────────

let queryR7: bigint = -1n; // NONE by default
let queryR8: bigint = 0n;
let solicitResult: bigint = 0n; // OK
let forgetResult: bigint = 0n; // OK
let provideResult: bigint = 0n; // OK

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

export function resetPreimages(): void {
  queryR7 = -1n;
  queryR8 = 0n;
  solicitResult = 0n;
  forgetResult = 0n;
  provideResult = 0n;
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
  return solicitResult;
}

/** Ecalli 24: Forget preimage solicitation — returns configured result. */
export function forget(
  _hash_ptr: number,
  _length: number,
): bigint {
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
  return provideResult;
}
