/**
 * Ecalli 4: Write storage.
 *
 * Write a value to the current service's storage.
 * Pass `value_len = 0` to delete the entry.
 *
 * Registers:
 * - r7  (in)  = k_o — storage key memory address
 * - r7  (out)       — previous value length, NONE (no prior value), or FULL
 * - r8  (in)  = k_z — storage key byte length
 * - r9  (in)  = v_o — value memory address
 * - r10 (in)  = v_z — value byte length (0 = delete)
 *
 * @param key_ptr - storage key memory address
 * @param key_len - storage key byte length
 * @param value_ptr - value memory address
 * @param value_len - value byte length (0 to delete)
 * @returns previous value length, NONE if no prior value, or FULL if storage full
 */
// @ts-expect-error: decorator
@external("ecalli", "write")
export declare function write(key_ptr: u32, key_len: u32, value_ptr: u32, value_len: u32): i64;
