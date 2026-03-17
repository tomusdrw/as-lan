/**
 * Ecalli 0: Gas remaining.
 *
 * Returns the remaining gas after this call.
 *
 * Registers:
 * - r7 (out) = remaining gas
 *
 * @returns remaining gas as i64
 */
// @ts-expect-error: decorator
@external("ecalli", "gas")
export declare function gas(): i64;
