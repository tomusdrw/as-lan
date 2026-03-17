/**
 * Ecalli 3: Read storage.
 *
 * Read a value from service storage by key.
 *
 * Registers:
 * - r7  (in)  = a   — service ID (u32_max = current service)
 * - r7  (out)       — total value length, or NONE if not found
 * - r8  (in)  = k_o — storage key memory address
 * - r9  (in)  = k_z — storage key byte length
 * - r10 (in)  = o   — destination memory address
 * - r11 (in)  = f   — offset within value
 * - r12 (in)  = l   — max length to write
 *
 * @param service - service ID (u32_max for current service)
 * @param key_ptr - storage key memory address
 * @param key_len - storage key byte length
 * @param out_ptr - destination memory address
 * @param offset - offset within stored value
 * @param length - max bytes to write
 * @returns total value length, or NONE if not found
 */
// @ts-expect-error: decorator
@external("ecalli", "read")
export declare function read(service: u32, key_ptr: u32, key_len: u32, out_ptr: u32, offset: u32, length: u32): i64;
