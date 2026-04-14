/**
 * Ecalli 15: Assign core.
 *
 * Assign an auth queue for a specific core. Only callable by that core's
 * assigner service (set via bless). The new_assigner parameter allows
 * transferring the assigner permission to another service.
 *
 * Registers:
 * - r7 (in)  = c — core index
 * - r7 (out)     — OK, CORE, HUH, or WHO
 * - r8 (in)  = a — auth queue memory address
 * - r9 (in)  = s — new assigner service ID
 *
 * @param core - core index
 * @param auth_queue_ptr - auth queue memory address
 * @param new_assigner - new assigner service ID (for permission transfer)
 * @returns OK, CORE, HUH, or WHO
 */
// @ts-expect-error: decorator
@external("ecalli", "assign")
export declare function assign(core: u32, auth_queue_ptr: u32, new_assigner: u32): i64;
