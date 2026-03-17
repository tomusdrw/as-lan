/**
 * Ecalli 18: New service (Omega_S).
 *
 * Create a new service account.
 *
 * Registers:
 * - r7  (in)  = h — code hash memory address
 * - r7  (out)     — new service ID, CASH, HUH, or FULL
 * - r8  (in)  = z — code length
 * - r9  (in)  = g — minimum accumulate gas
 * - r10 (in)  = a — initial allowance
 * - r11 (in)  = s — gratis storage bytes
 * - r12 (in)  = i — requested service ID (or u32_max for auto-assign)
 *
 * @param code_hash_ptr - code hash memory address
 * @param code_len - code length
 * @param gas - minimum accumulate gas
 * @param allowance - initial allowance
 * @param gratis_storage - gratis storage bytes
 * @param requested_id - requested service ID (u32_max for auto)
 * @returns new service ID, CASH, HUH, or FULL
 */
// @ts-expect-error: decorator
@external("ecalli", "new_service")
export declare function new_service(code_hash_ptr: u32, code_len: u32, gas: u64, allowance: u64, gratis_storage: u32, requested_id: u32): i64;
