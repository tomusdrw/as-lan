/**
 * Ecalli 12: Invoke inner machine (Omega_V).
 *
 * Run an inner PVM machine. The io_ptr points to a structure
 * containing gas limit and registers that is read before and
 * written after execution.
 *
 * Registers:
 * - r7 (in)  = m — machine ID
 * - r7 (out)     — exit reason (HALT, PANIC, FAULT, HOST, OOB) or WHO
 * - r8 (in)  = o — I/O structure memory address
 * - r8 (out)     — secondary result (written to out_r8 pointer)
 *
 * @param machine_id - inner machine ID
 * @param io_ptr - pointer to gas+registers I/O structure
 * @param out_r8 - pointer where the r8 output value will be written (i64)
 * @returns exit reason or WHO
 */
// @ts-expect-error: decorator
@external("ecalli", "invoke")
export declare function invoke(machine_id: u32, io_ptr: u32, out_r8: usize): i64;
