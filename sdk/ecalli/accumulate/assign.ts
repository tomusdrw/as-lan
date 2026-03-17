/**
 * Ecalli 15: Assign core (Omega_C).
 *
 * Assign a core to authorization work.
 *
 * Registers:
 * - r7 (in)  = c — core index
 * - r7 (out)     — OK, CORE, HUH, or WHO
 * - r8 (in)  = a — auth queue memory address
 * - r9 (in)  = s — assigners (bitmask)
 *
 * @param core - core index
 * @param auth_queue_ptr - auth queue memory address
 * @param assigners - assigners bitmask
 * @returns OK, CORE, HUH, or WHO
 */
// @ts-expect-error: decorator
@external("ecalli", "assign")
export declare function assign(core: u32, auth_queue_ptr: u32, assigners: u32): i64;
