/**
 * Ecalli 21: Eject service.
 *
 * Remove a service from the system and recover its balance.
 *
 * Registers:
 * - r7 (in)  = s — service ID to eject
 * - r7 (out)     — OK, WHO, or HUH
 * - r8 (in)  = h — previous code hash memory address (for verification)
 *
 * @param service - service ID to eject
 * @param prev_code_hash_ptr - previous code hash memory address
 * @returns OK, WHO, or HUH
 */
// @ts-expect-error: decorator
@external("ecalli", "eject")
export declare function eject(service: u32, prev_code_hash_ptr: u32): i64;
