/**
 * Ecalli 25: Yield result hash (Omega_M).
 *
 * Provide the accumulation result hash.
 *
 * Registers:
 * - r7 (in)  = h — result hash memory address (32 bytes)
 * - r7 (out)     — OK
 *
 * @param hash_ptr - result hash memory address (32 bytes)
 * @returns OK
 */
// @ts-expect-error: decorator
@external("ecalli", "yield_result")
export declare function yield_result(hash_ptr: u32): i64;
