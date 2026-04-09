// Ecalli 8-13: Inner PVM machine operations.
//
// machine (8), peek (9), poke (10), pages (11), invoke (12), expunge (13)
// are tightly coupled — all operate on inner machines created via machine().

import { writeI64 } from "../memory.js";

let machineCounter = 0;
let machineResult: bigint | null = null;
let peekResult: bigint | null = null;
let pokeResult: bigint | null = null;
let pagesResult: bigint | null = null;
let invokeResult: bigint | null = null;
let invokeR8: bigint = 0n;
let expungeResult: bigint | null = null;

/** Ecalli 8: Create inner PVM machine. */
export function machine(
  _code_ptr: number,
  _code_len: number,
  _entrypoint: number,
): bigint {
  if (machineResult !== null) return machineResult;
  return BigInt(machineCounter++);
}

/** Ecalli 9: Peek inner machine memory — returns OK. */
export function peek(
  _machine_id: number,
  _dest_ptr: number,
  _source: number,
  _length: number,
): bigint {
  if (peekResult !== null) return peekResult;
  return 0n; // OK
}

/** Ecalli 10: Poke inner machine memory — returns OK. */
export function poke(
  _machine_id: number,
  _source_ptr: number,
  _dest: number,
  _length: number,
): bigint {
  if (pokeResult !== null) return pokeResult;
  return 0n; // OK
}

/** Ecalli 11: Set inner machine page access — returns OK. */
export function pages(
  _machine_id: number,
  _start_page: number,
  _page_count: number,
  _access_type: number,
): bigint {
  if (pagesResult !== null) return pagesResult;
  return 0n; // OK
}

/** Ecalli 12: Invoke inner machine — returns HALT (0), writes r8. */
export function invoke(
  _machine_id: number,
  _io_ptr: number,
  out_r8: number,
): bigint {
  writeI64(out_r8, invokeR8);
  if (invokeResult !== null) return invokeResult;
  return 0n; // HALT
}

/** Ecalli 13: Expunge inner machine — returns OK. */
export function expunge(
  _machine_id: number,
): bigint {
  if (expungeResult !== null) return expungeResult;
  return 0n; // OK
}

// ─── Configuration functions (called from AS test-ecalli helpers) ───

export function setMachineResult(result: bigint): void {
  machineResult = result;
}

export function setPeekResult(result: bigint): void {
  peekResult = result;
}

export function setPokeResult(result: bigint): void {
  pokeResult = result;
}

export function setPagesResult(result: bigint): void {
  pagesResult = result;
}

export function setInvokeResult(result: bigint, r8: bigint = 0n): void {
  invokeResult = result;
  invokeR8 = r8;
}

export function setExpungeResult(result: bigint): void {
  expungeResult = result;
}

export function resetMachines(): void {
  machineCounter = 0;
  machineResult = null;
  peekResult = null;
  pokeResult = null;
  pagesResult = null;
  invokeResult = null;
  invokeR8 = 0n;
  expungeResult = null;
}
