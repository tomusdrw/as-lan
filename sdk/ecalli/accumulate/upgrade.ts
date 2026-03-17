/**
 * Ecalli 19: Upgrade service code.
 *
 * Upgrade the current service's code.
 *
 * Registers:
 * - r7 (in)  = h — new code hash memory address
 * - r7 (out)     — OK
 * - r8 (in)  = g — new minimum accumulate gas
 * - r9 (in)  = a — new allowance
 *
 * @param code_hash_ptr - new code hash memory address
 * @param gas - new minimum accumulate gas
 * @param allowance - new allowance
 * @returns OK
 */
// @ts-expect-error: decorator
@external("ecalli", "upgrade")
export declare function upgrade(code_hash_ptr: u32, gas: u64, allowance: u64): i64;
