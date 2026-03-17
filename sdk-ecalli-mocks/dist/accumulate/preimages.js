// Ecalli 22-26: Preimage management operations.
//
// query (22), solicit (23), forget (24), yield_result (25), provide (26)
// — manage preimage availability and solicitation.
import { writeI64 } from "../memory.js";
/** Ecalli 22: Query preimage status — returns NONE, writes r8 = 0. */
export function query(_hash_ptr, _length, out_r8) {
    writeI64(out_r8, 0n);
    return -1n; // NONE
}
/** Ecalli 23: Solicit preimage — returns OK. */
export function solicit(_hash_ptr, _length) {
    return 0n; // OK
}
/** Ecalli 24: Forget preimage solicitation — returns OK. */
export function forget(_hash_ptr, _length) {
    return 0n; // OK
}
/** Ecalli 25: Yield accumulation result hash — returns OK. */
export function yield_result(_hash_ptr) {
    return 0n; // OK
}
/** Ecalli 26: Provide preimage for solicited hash — returns OK. */
export function provide(_service, _preimage_ptr, _preimage_len) {
    return 0n; // OK
}
