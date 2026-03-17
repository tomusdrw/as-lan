// Mock stubs for accumulate host calls (ecalli 14-26).
import { gas } from "./gas.js";
import { writeI64 } from "./memory.js";
// ---------------------------------------------------------------------------
// 14 — bless (returns OK)
// ---------------------------------------------------------------------------
export function bless(_manager, _auth_queue_ptr, _delegator, _registrar, _auto_accum_ptr, _auto_accum_count) {
    return 0n; // OK
}
// ---------------------------------------------------------------------------
// 15 — assign (returns OK)
// ---------------------------------------------------------------------------
export function assign(_core, _auth_queue_ptr, _assigners) {
    return 0n; // OK
}
// ---------------------------------------------------------------------------
// 16 — designate (returns OK)
// ---------------------------------------------------------------------------
export function designate(_validators_ptr) {
    return 0n; // OK
}
// ---------------------------------------------------------------------------
// 17 — checkpoint (returns remaining gas, same as gas())
// ---------------------------------------------------------------------------
export function checkpoint() {
    return gas();
}
// ---------------------------------------------------------------------------
// 18 — new_service (counter-based)
// ---------------------------------------------------------------------------
const DEFAULT_SERVICE_START = 256;
let serviceCounter = DEFAULT_SERVICE_START;
export function new_service(_code_hash_ptr, _code_len, _gas, _allowance, _gratis_storage, _requested_id) {
    return BigInt(serviceCounter++);
}
// ---------------------------------------------------------------------------
// 19 — upgrade (returns OK)
// ---------------------------------------------------------------------------
export function upgrade(_code_hash_ptr, _gas, _allowance) {
    return 0n; // OK
}
// ---------------------------------------------------------------------------
// 20 — transfer (returns OK)
// ---------------------------------------------------------------------------
export function transfer(_dest, _amount, _gas_fee, _memo_ptr) {
    return 0n; // OK
}
// ---------------------------------------------------------------------------
// 21 — eject (returns OK)
// ---------------------------------------------------------------------------
export function eject(_service, _prev_code_hash_ptr) {
    return 0n; // OK
}
// ---------------------------------------------------------------------------
// 22 — query (returns NONE, r8 = 0)
// ---------------------------------------------------------------------------
export function query(_hash_ptr, _length, out_r8) {
    writeI64(out_r8, 0n);
    return -1n; // NONE
}
// ---------------------------------------------------------------------------
// 23 — solicit (returns OK)
// ---------------------------------------------------------------------------
export function solicit(_hash_ptr, _length) {
    return 0n; // OK
}
// ---------------------------------------------------------------------------
// 24 — forget (returns OK)
// ---------------------------------------------------------------------------
export function forget(_hash_ptr, _length) {
    return 0n; // OK
}
// ---------------------------------------------------------------------------
// 25 — yield_result (returns OK)
// ---------------------------------------------------------------------------
export function yield_result(_hash_ptr) {
    return 0n; // OK
}
// ---------------------------------------------------------------------------
// 26 — provide (returns OK)
// ---------------------------------------------------------------------------
export function provide(_service, _preimage_ptr, _preimage_len) {
    return 0n; // OK
}
// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------
export function resetAccumulate() {
    serviceCounter = DEFAULT_SERVICE_START;
}
