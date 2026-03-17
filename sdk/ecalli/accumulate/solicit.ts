/**
 * Ecalli 23: Solicit preimage (Omega_O).
 *
 * Request that a preimage be made available.
 *
 * Registers:
 * - r7 (in)  = h — hash memory address
 * - r7 (out)     — OK, HUH, or FULL
 * - r8 (in)  = z — preimage length
 *
 * @param hash_ptr - hash memory address
 * @param length - preimage length
 * @returns OK, HUH, or FULL
 */
// @ts-expect-error: decorator
@external("ecalli", "solicit")
export declare function solicit(hash_ptr: u32, length: u32): i64;
