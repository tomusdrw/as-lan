// Ecalli 8-13: Inner PVM machine operations.
//
// machine (8), peek (9), poke (10), pages (11), invoke (12), expunge (13)
// are tightly coupled — all operate on inner machines created via machine().
import { writeI64 } from "../memory.js";
let machineCounter = 0;
/** Ecalli 8: Create inner PVM machine — returns incrementing machine ID. */
export function machine(_code_ptr, _code_len, _entrypoint) {
    return BigInt(machineCounter++);
}
/** Ecalli 9: Peek inner machine memory — returns OK. */
export function peek(_machine_id, _dest_ptr, _source, _length) {
    return 0n; // OK
}
/** Ecalli 10: Poke inner machine memory — returns OK. */
export function poke(_machine_id, _source_ptr, _dest, _length) {
    return 0n; // OK
}
/** Ecalli 11: Set inner machine page access — returns OK. */
export function pages(_machine_id, _start_page, _page_count, _access_type) {
    return 0n; // OK
}
/** Ecalli 12: Invoke inner machine — returns HALT (0), writes r8 = 0. */
export function invoke(_machine_id, _io_ptr, out_r8) {
    writeI64(out_r8, 0n);
    return 0n; // HALT
}
/** Ecalli 13: Expunge inner machine — returns OK. */
export function expunge(_machine_id) {
    return 0n; // OK
}
export function resetMachines() {
    machineCounter = 0;
}
