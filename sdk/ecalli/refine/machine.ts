/**
 * Ecalli 8: Create inner PVM machine (Omega_N).
 *
 * Create a new inner PVM for nested execution.
 *
 * Registers:
 * - r7 (in)  = p — code memory address
 * - r7 (out)     — machine ID on success, or HUH on failure
 * - r8 (in)  = z — code length
 * - r9 (in)  = e — entrypoint offset
 *
 * @param code_ptr - code memory address
 * @param code_len - code length
 * @param entrypoint - entrypoint offset within code
 * @returns machine ID on success, or HUH on failure
 */
// @ts-expect-error: decorator
@external("ecalli", "machine")
export declare function machine(code_ptr: u32, code_len: u32, entrypoint: u32): i64;
