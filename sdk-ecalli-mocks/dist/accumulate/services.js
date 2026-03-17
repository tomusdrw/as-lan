// Ecalli 18-19, 21: Service lifecycle operations.
//
// new_service (18), upgrade (19), eject (21) — create, upgrade, or
// remove services.
const DEFAULT_SERVICE_START = 256;
let serviceCounter = DEFAULT_SERVICE_START;
/** Ecalli 18: Create new service — returns incrementing service ID. */
export function new_service(_code_hash_ptr, _code_len, _gas, _allowance, _gratis_storage, _requested_id) {
    return BigInt(serviceCounter++);
}
/** Ecalli 19: Upgrade service code — returns OK. */
export function upgrade(_code_hash_ptr, _gas, _allowance) {
    return 0n; // OK
}
/** Ecalli 21: Eject service — returns OK. */
export function eject(_service, _prev_code_hash_ptr) {
    return 0n; // OK
}
export function resetServices() {
    serviceCounter = DEFAULT_SERVICE_START;
}
