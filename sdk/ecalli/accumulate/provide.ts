/**
 * Ecalli 26: Provide preimage.
 *
 * Supply a preimage for a previously solicited hash.
 *
 * Registers:
 * - r7 (in)  = s — service ID
 * - r7 (out)     — OK, WHO, or HUH
 * - r8 (in)  = o — preimage memory address
 * - r9 (in)  = z — preimage length
 *
 * @param service - service ID
 * @param preimage_ptr - preimage memory address
 * @param preimage_len - preimage length
 * @returns OK, WHO, or HUH
 */
// @ts-expect-error: decorator
@external("ecalli", "provide")
export declare function provide(service: u32, preimage_ptr: u32, preimage_len: u32): i64;
