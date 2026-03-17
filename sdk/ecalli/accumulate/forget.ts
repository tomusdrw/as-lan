/**
 * Ecalli 24: Forget preimage.
 *
 * Cancel a previous preimage solicitation.
 *
 * Registers:
 * - r7 (in)  = h — hash memory address
 * - r7 (out)     — OK or HUH
 * - r8 (in)  = z — preimage length
 *
 * @param hash_ptr - hash memory address
 * @param length - preimage length
 * @returns OK or HUH
 */
// @ts-expect-error: decorator
@external("ecalli", "forget")
export declare function forget(hash_ptr: u32, length: u32): i64;
