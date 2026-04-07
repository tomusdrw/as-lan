import { log } from "../ecalli";
import { BytesBlob } from "./bytes";

/**
 * Terminate execution with a message.
 *
 * Use for host-contract violations and other "should never happen" conditions
 * where continuing execution is meaningless (e.g. the host returned malformed data).
 */
export function panic(msg: string): void {
  const targetBuf = BytesBlob.encodeAscii("panic");
  const msgBuf = BytesBlob.encodeAscii(msg);
  log(0, targetBuf.ptr(), targetBuf.length, msgBuf.ptr(), msgBuf.length);
  abort(msg);
}
