// Ecalli 8-13: Inner PVM machine operations.
//
// machine (8), peek (9), poke (10), pages (11), invoke (12), expunge (13)
// are tightly coupled — all operate on inner machines created via machine().

import { writeI64 } from "../memory.js";

let machineCounter = 0;

/** Ecalli 8: Create inner PVM machine — returns incrementing machine ID. */
export function machine(
  _code_ptr: number,
  _code_len: number,
  _entrypoint: number,
): bigint {
  return BigInt(machineCounter++);
}

/** Ecalli 9: Peek inner machine memory — returns OK. */
export function peek(
  _machine_id: number,
  _dest_ptr: number,
  _source: number,
  _length: number,
): bigint {
  return 0n; // OK
}

/** Ecalli 10: Poke inner machine memory — returns OK. */
export function poke(
  _machine_id: number,
  _source_ptr: number,
  _dest: number,
  _length: number,
): bigint {
  return 0n; // OK
}

/** Ecalli 11: Set inner machine page access — returns OK. */
export function pages(
  _machine_id: number,
  _start_page: number,
  _page_count: number,
  _access_type: number,
): bigint {
  return 0n; // OK
}

/** Ecalli 12: Invoke inner machine — returns HALT (0), writes r8 = 0. */
export function invoke(
  _machine_id: number,
  _io_ptr: number,
  out_r8: number,
): bigint {
  writeI64(out_r8, 0n);
  return 0n; // HALT
}

/** Ecalli 13: Expunge inner machine — returns OK. */
export function expunge(
  _machine_id: number,
): bigint {
  return 0n; // OK
}

export function resetMachines(): void {
  machineCounter = 0;
}
