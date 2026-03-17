/**
 * Ecalli 20: Transfer funds.
 *
 * Transfer balance to another service and optionally attach a memo.
 *
 * Registers:
 * - r7 (in)  = d — destination service ID
 * - r7 (out)     — OK, WHO, LOW, or CASH
 * - r8 (in)  = a — amount
 * - r9 (in)  = g — gas fee limit
 * - r10 (in) = m — memo memory address (128 bytes)
 *
 * @param dest - destination service ID
 * @param amount - transfer amount
 * @param gas_fee - gas fee limit
 * @param memo_ptr - memo memory address (128 bytes)
 * @returns OK, WHO, LOW, or CASH
 */
// @ts-expect-error: decorator
@external("ecalli", "transfer")
export declare function transfer(dest: u32, amount: u64, gas_fee: u64, memo_ptr: u32): i64;
