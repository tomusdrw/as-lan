/**
 * Ecalli 9: Peek inner machine memory.
 *
 * Read data from an inner PVM machine's memory.
 *
 * Registers:
 * - r7 (in)  = m — machine ID
 * - r7 (out)     — OK, WHO (unknown machine), or OOB (out of bounds)
 * - r8 (in)  = o — destination memory address in host
 * - r9 (in)  = s — source address in machine
 * - r10 (in) = z — number of bytes to read
 *
 * @param machine_id - inner machine ID
 * @param dest_ptr - destination memory address in host
 * @param source - source address in inner machine
 * @param length - number of bytes to read
 * @returns OK, WHO, or OOB
 */
// @ts-expect-error: decorator
@external("ecalli", "peek")
export declare function peek(machine_id: u32, dest_ptr: u32, source: u32, length: u32): i64;
