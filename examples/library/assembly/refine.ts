import { BytesBlob, Decoder, Encoder, RefineContext } from "@fluffylabs/as-lan";
import { AdminCommandCodec } from "./admin";

const ERR_ADMIN_MALFORMED: i64 = -6;
const ERR_PARSE: i64 = -7;

export function refine(ptr: u32, len: u32): u64 {
  const ctx = RefineContext.create();
  const args = ctx.parseArgs(ptr, len);
  const payload = args.payload;

  if (payload.length < 1) return ctx.respond(ERR_PARSE);

  const tag = payload.raw[0];
  const rest = BytesBlob.wrap(payload.raw.subarray(1));

  if (tag === 1) return handleAdmin(ctx, rest);
  if (tag === 0) return ctx.respond(ERR_PARSE); // demo — next task
  return ctx.respond(ERR_PARSE);
}

function handleAdmin(ctx: RefineContext, rest: BytesBlob): u64 {
  const codec = AdminCommandCodec.create();
  const r = codec.decode(Decoder.fromBlob(rest.raw));
  if (r.isError) return ctx.respond(ERR_ADMIN_MALFORMED);

  const enc = Encoder.create();
  codec.encode(r.okay!, enc);
  return ctx.respond(0, enc.finishRaw());
}
