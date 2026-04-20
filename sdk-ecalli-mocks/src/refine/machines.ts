// Ecalli 8-13: Inner PVM machine operations.
//
// machine (8), peek (9), poke (10), pages (11), invoke (12), expunge (13)
// are tightly coupled — all operate on inner machines created via machine().

import { readBytes, writeI64, writeToMem } from "../memory.js";

let machineCounter = 0;
let machineResult: bigint | null = null;
let peekResult: bigint | null = null;
let peekData: Uint8Array | null = null;
let pokeResult: bigint | null = null;
let pagesResult: bigint | null = null;
let invokeResult: bigint | null = null;
let invokeR8: bigint = 0n;
let invokeIoR7: bigint | null = null;
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
  dest_ptr: number,
  _source: number,
  length: number,
): bigint {
  // Skip memory write when the mock is configured with an error sentinel —
  // a real host returning OOB/WHO would not touch the destination buffer.
  if (peekResult !== null && peekResult < 0n) return peekResult;
  if (peekData !== null) {
    writeToMem(dest_ptr, peekData, 0, length);
  }
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
  io_ptr: number,
  out_r8: number,
): bigint {
  writeI64(out_r8, invokeR8);
  if (invokeIoR7 !== null) {
    // InvokeIo layout: [gas(8), r0(8), r1(8), ..., r12(8)]. r7 is at offset 8 + 7*8 = 64.
    writeI64(io_ptr + 64, invokeIoR7);
  }
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

/** Configure peek() to copy these bytes into dest_ptr. AS calls via (ptr, len). */
export function setPeekData(ptr: number, len: number): void {
  peekData = readBytes(ptr, len);
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

export function setInvokeIoR7(value: bigint): void {
  invokeIoR7 = value;
}

export function setExpungeResult(result: bigint): void {
  expungeResult = result;
}

export function resetMachines(): void {
  machineCounter = 0;
  machineResult = null;
  peekResult = null;
  peekData = null;
  pokeResult = null;
  pagesResult = null;
  invokeResult = null;
  invokeR8 = 0n;
  invokeIoR7 = null;
  expungeResult = null;
}
