// Ecalli 22-26: Preimage management operations.
//
// query (22), solicit (23), forget (24), yield_result (25), provide (26)
// — manage preimage availability and solicitation.

import { writeI64 } from "../memory.js";

/** Ecalli 22: Query preimage status — returns NONE, writes r8 = 0. */
export function query(
  _hash_ptr: number,
  _length: number,
  out_r8: number,
): bigint {
  writeI64(out_r8, 0n);
  return -1n; // NONE
}

/** Ecalli 23: Solicit preimage — returns OK. */
export function solicit(
  _hash_ptr: number,
  _length: number,
): bigint {
  return 0n; // OK
}

/** Ecalli 24: Forget preimage solicitation — returns OK. */
export function forget(
  _hash_ptr: number,
  _length: number,
): bigint {
  return 0n; // OK
}

/** Ecalli 25: Yield accumulation result hash — returns OK. */
export function yield_result(
  _hash_ptr: number,
): bigint {
  return 0n; // OK
}

/** Ecalli 26: Provide preimage for solicited hash — returns OK. */
export function provide(
  _service: number,
  _preimage_ptr: number,
  _preimage_len: number,
): bigint {
  return 0n; // OK
}
