/**
 * Ecalli 10: Poke inner machine memory (Omega_K).
 *
 * Write data into an inner PVM machine's memory.
 *
 * Registers:
 * - r7 (in)  = m — machine ID
 * - r7 (out)     — OK, WHO (unknown machine), or OOB (out of bounds)
 * - r8 (in)  = o — source memory address in host
 * - r9 (in)  = d — destination address in machine
 * - r10 (in) = z — number of bytes to write
 *
 * @param machine_id - inner machine ID
 * @param source_ptr - source memory address in host
 * @param dest - destination address in inner machine
 * @param length - number of bytes to write
 * @returns OK, WHO, or OOB
 */
// @ts-expect-error: decorator
@external("ecalli", "poke")
export declare function poke(machine_id: u32, source_ptr: u32, dest: u32, length: u32): i64;
