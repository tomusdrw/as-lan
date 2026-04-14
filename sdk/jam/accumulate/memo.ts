/**
 * Fixed-size 128-byte memo for transfers.
 *
 * Shorter input is zero-padded to 128 bytes. Input exceeding 128 bytes
 * is silently truncated.
 */

import { BytesBlob } from "../../core/bytes";
import { TRANSFER_MEMO_SIZE } from "./item";

export { TRANSFER_MEMO_SIZE };

export class Memo {
  /**
   * Create a memo from arbitrary data.
   *
   * If data is shorter than 128 bytes it is zero-padded.
   * If data is longer than 128 bytes it is truncated.
   */
  static create(data: BytesBlob): Memo {
    if (<u32>data.length === TRANSFER_MEMO_SIZE) {
      return new Memo(data);
    }
    const padded = BytesBlob.zero(TRANSFER_MEMO_SIZE);
    const copyLen = min<u32>(<u32>data.length, TRANSFER_MEMO_SIZE);
    memory.copy(padded.raw.dataStart, data.raw.dataStart, copyLen);
    return new Memo(padded);
  }

  /** Create an empty memo (128 zero bytes). */
  static empty(): Memo {
    return new Memo(BytesBlob.zero(TRANSFER_MEMO_SIZE));
  }

  private constructor(
    /** The 128-byte memo data. */
    public readonly data: BytesBlob,
  ) {}

  /** Pointer to the underlying memory (for ecalli calls). */
  ptr(): u32 {
    return this.data.ptr();
  }
}
