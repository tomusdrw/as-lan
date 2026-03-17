/**
 * Ecalli 13: Expunge inner machine.
 *
 * Destroy an inner PVM machine and recover its resources.
 *
 * Registers:
 * - r7 (in)  = m — machine ID
 * - r7 (out)     — hash/result on success, or WHO if unknown
 *
 * @param machine_id - inner machine ID
 * @returns result on success, or WHO if unknown machine
 */
// @ts-expect-error: decorator
@external("ecalli", "expunge")
export declare function expunge(machine_id: u32): i64;
