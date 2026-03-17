/**
 * Ecalli 16: Designate validators.
 *
 * Set the next epoch's validator keys.
 *
 * Registers:
 * - r7 (in)  = v — validators data memory address
 * - r7 (out)     — OK or HUH
 *
 * @param validators_ptr - validators data memory address
 * @returns OK or HUH
 */
// @ts-expect-error: decorator
@external("ecalli", "designate")
export declare function designate(validators_ptr: u32): i64;
