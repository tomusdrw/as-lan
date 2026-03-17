/**
 * Ecalli 22: Query preimage status (Omega_Q).
 *
 * Check whether a preimage is available and its status.
 *
 * Registers:
 * - r7 (in)  = h — hash memory address
 * - r7 (out)     — NONE, or preimage length
 * - r8 (in)  = z — preimage length
 * - r8 (out)     — slot info (written to out_r8 pointer)
 *
 * @param hash_ptr - hash memory address
 * @param length - preimage length
 * @param out_r8 - pointer where the r8 output value will be written (i64)
 * @returns NONE if not found, or preimage length
 */
// @ts-expect-error: decorator
@external("ecalli", "query")
export declare function query(hash_ptr: u32, length: u32, out_r8: usize): i64;
