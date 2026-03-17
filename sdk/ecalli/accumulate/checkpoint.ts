/**
 * Ecalli 17: Checkpoint (Omega_T).
 *
 * Create a state checkpoint, committing all changes up to this point.
 * Returns remaining gas after the checkpoint (same semantics as gas).
 *
 * Registers:
 * - r7 (out) = remaining gas
 *
 * @returns remaining gas as i64
 */
// @ts-expect-error: decorator
@external("ecalli", "checkpoint")
export declare function checkpoint(): i64;
