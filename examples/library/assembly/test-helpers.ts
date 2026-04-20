import {
  Bytes32,
  BytesBlob,
  Decoder,
  Encoder,
  RefineArgs,
  RefineContext,
  Response,
} from "@fluffylabs/as-lan";
import { unpackResult } from "@fluffylabs/as-lan/test";
import { refine } from "./refine";

/** Call refine with the given payload and decode the Response. */
export function callRefine(payload: Uint8Array): Response {
  const ctx = RefineContext.create();
  const args = RefineArgs.create(
    0,
    0,
    42,
    BytesBlob.wrap(payload),
    Bytes32.wrapUnchecked(new Uint8Array(32)),
  );
  const enc = Encoder.create();
  ctx.refineArgs.encode(args, enc);
  const encoded = enc.finishRaw();
  const buf = new Uint8Array(encoded.length);
  buf.set(encoded);
  const raw = unpackResult(refine(u32(buf.dataStart), buf.byteLength));
  return ctx.response.decode(Decoder.fromBlob(raw)).okay!;
}
