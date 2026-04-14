/**
 * Ecalli 14: Bless.
 *
 * Set the blessed/privileged service configuration. Only the manager
 * can change all fields; the delegator and registrar can each update
 * only their own successor.
 *
 * Registers:
 * - r7  (in)  = m — manager service ID
 * - r7  (out)     — OK, HUH, or WHO
 * - r8  (in)  = a — assigners memory address (ServiceId per core)
 * - r9  (in)  = d — delegator service ID
 * - r10 (in)  = r — registrar service ID
 * - r11 (in)  = p — auto-accumulate entries memory address (ServiceId ++ Gas per entry)
 * - r12 (in)  = n — auto-accumulate entry count
 *
 * @param manager - manager service ID
 * @param assigners_ptr - assigners memory address (one ServiceId per core)
 * @param delegator - delegator service ID
 * @param registrar - registrar service ID
 * @param auto_accum_ptr - auto-accumulate entries memory address
 * @param auto_accum_count - number of auto-accumulate entries
 * @returns OK, HUH, or WHO
 */
// @ts-expect-error: decorator
@external("ecalli", "bless")
export declare function bless(manager: u32, assigners_ptr: u32, delegator: u32, registrar: u32, auto_accum_ptr: u32, auto_accum_count: u32): i64;
