/**
 * Ecalli 14: Bless.
 *
 * Set the blessed/privileged service configuration.
 *
 * Registers:
 * - r7  (in)  = m — manager service ID
 * - r7  (out)     — OK, HUH, or WHO
 * - r8  (in)  = a — auth queue memory address
 * - r9  (in)  = d — delegator service ID
 * - r10 (in)  = r — registrar service ID
 * - r11 (in)  = p — auto-accumulate services memory address
 * - r12 (in)  = n — auto-accumulate count
 *
 * @param manager - manager service ID
 * @param auth_queue_ptr - auth queue memory address
 * @param delegator - delegator service ID
 * @param registrar - registrar service ID
 * @param auto_accum_ptr - auto-accumulate services memory address
 * @param auto_accum_count - number of auto-accumulate entries
 * @returns OK, HUH, or WHO
 */
// @ts-expect-error: decorator
@external("ecalli", "bless")
export declare function bless(manager: u32, auth_queue_ptr: u32, delegator: u32, registrar: u32, auto_accum_ptr: u32, auto_accum_count: u32): i64;
