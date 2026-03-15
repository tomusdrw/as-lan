/**
 * Host call declarations for JAM services.
 *
 * These are extern functions provided by the JAM runtime (PVM host).
 * Each maps to an ecalli instruction at the PVM level.
 *
 * Register mapping conventions:
 * - r7 is the in/out register (first arg and return value)
 * - r8-r12 carry additional arguments
 *
 * @see https://graypaper.fluffylabs.dev/#/ab2cdbd?v=0.7.2
 * @module
 */

/** Return value sentinel constants for ecalli host calls. */
export class EcalliResult {
  /** Item does not exist */
  static readonly NONE: i64 = -1;
  /** Name unknown */
  static readonly WHAT: i64 = -2;
  /** Memory index not accessible */
  static readonly OOB: i64 = -3;
  /** Index unknown */
  static readonly WHO: i64 = -4;
  /** Storage full */
  static readonly FULL: i64 = -5;
  /** Core index unknown */
  static readonly CORE: i64 = -6;
  /** Insufficient funds */
  static readonly CASH: i64 = -7;
  /** Gas limit too low */
  static readonly LOW: i64 = -8;
  /** Invalid operation */
  static readonly HUH: i64 = -9;
}

export { FetchKind, fetch } from "./fetch";
export { gas } from "./gas";
export { info } from "./info";
export { log } from "./log";
export { lookup } from "./lookup";
export { read } from "./read";
export { write } from "./write";
