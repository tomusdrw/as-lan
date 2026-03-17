/**
 * Ecalli 2: Lookup preimage (Omega_L).
 *
 * Look up a preimage by its hash for the given (or current) service.
 *
 * Registers:
 * - r7  (in)  = a — service ID (u32_max = current service)
 * - r7  (out)     — total preimage length, or NONE if not found
 * - r8  (in)  = h — memory address of 32-byte hash
 * - r9  (in)  = o — destination memory address
 * - r10 (in)  = f — offset within preimage
 * - r11 (in)  = l — max length to write
 *
 * @param service - service ID (u32_max for current service)
 * @param hash_ptr - pointer to 32-byte blake2b hash
 * @param out_ptr - destination memory address
 * @param offset - offset within preimage blob
 * @param length - max bytes to write
 * @returns total preimage length, or NONE if not found
 */
// @ts-expect-error: decorator
@external("ecalli", "lookup")
export declare function lookup(service: u32, hash_ptr: u32, out_ptr: u32, offset: u32, length: u32): i64;
