/**
 * Refine invocation context.
 *
 * Provides convenience methods for parsing arguments and encoding responses.
 */

import { BytesBlob } from "../../core/bytes";
import { Decoder } from "../../core/codec/decode";
import { Encoder } from "../../core/codec/encode";
import { readFromMemory } from "../../core/mem";
import { ptrAndLen } from "../../core/pack";
import { panic } from "../../core/panic";
import { RefineArgs, RefineArgsCodec, Response, ResponseCodec } from "../service";

export class RefineContext {
  static create(): RefineContext {
    return new RefineContext();
  }

  readonly refineArgs: RefineArgsCodec;
  readonly response: ResponseCodec;

  private constructor() {
    this.refineArgs = RefineArgsCodec.create();
    this.response = ResponseCodec.create();
  }

  /** Parse raw refine arguments from (ptr, len). Panics on invalid data. */
  parseArgs(ptr: u32, len: u32): RefineArgs {
    const decoder = Decoder.fromBlob(readFromMemory(ptr, len));
    const r = this.refineArgs.decode(decoder);
    if (r.isError) panic("Failed to decode RefineArgs");
    if (!decoder.isFinished()) panic("Trailing bytes after RefineArgs");
    return r.okay!;
  }

  /** Encode a response and return it as a ptrAndLen-packed u64. */
  respond(ecalliResult: i64, data: Uint8Array | null = null): u64 {
    const bytes = data === null ? BytesBlob.empty() : BytesBlob.wrap(data);
    const enc = Encoder.create(8 + 1 + bytes.raw.length);
    this.response.encode(Response.create(ecalliResult, bytes), enc);
    return ptrAndLen(enc.finishRaw());
  }
}
