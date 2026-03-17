/**
 * Ecalli 5: Service info.
 *
 * Get account info for the given (or current) service.
 * Returns a 96-byte encoded structure:
 * - code_hash (32B), balance (8B), threshold_balance (8B),
 *   accumulate_min_gas (8B), on_transfer_min_gas (8B),
 *   storage_bytes (8B), storage_count (4B), gratis_storage (8B),
 *   created_slot (4B), last_accumulation_slot (4B), parent_service (4B)
 *
 * Registers:
 * - r7  (in)  = a — service ID (u32_max = current service)
 * - r7  (out)     — total info length (96), or NONE if account missing
 * - r8  (in)  = o — destination memory address
 * - r9  (in)  = f — offset within info
 * - r10 (in)  = l — max length to write
 *
 * @param service - service ID (u32_max for current service)
 * @param out_ptr - destination memory address
 * @param offset - offset within info structure
 * @param length - max bytes to write
 * @returns total info length (96), or NONE if account does not exist
 */
// @ts-expect-error: decorator
@external("ecalli", "info")
export declare function info(service: u32, out_ptr: u32, offset: u32, length: u32): i64;
