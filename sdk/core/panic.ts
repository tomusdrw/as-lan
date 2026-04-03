/**
 * Terminate execution with a message.
 *
 * Use for host-contract violations and other "should never happen" conditions
 * where continuing execution is meaningless (e.g. the host returned malformed data).
 */
export function panic(msg: string): void {
  abort(msg);
}
