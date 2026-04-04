import { log } from "../ecalli";

/**
 * Terminate execution with a message.
 *
 * Use for host-contract violations and other "should never happen" conditions
 * where continuing execution is meaningless (e.g. the host returned malformed data).
 */
export function panic(msg: string): void {
  const target = "panic";
  const targetBuf = String.UTF8.encode(target);
  const msgBuf = String.UTF8.encode(msg);
  log(0, changetype<u32>(targetBuf), targetBuf.byteLength, changetype<u32>(msgBuf), msgBuf.byteLength);
  abort(msg);
}
