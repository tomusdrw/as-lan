import { RefineContext } from "@fluffylabs/as-lan";

const ERR_PARSE: i64 = -7;

export function refine(ptr: u32, len: u32): u64 {
  const ctx = RefineContext.create();
  const args = ctx.parseArgs(ptr, len);
  const payload = args.payload;

  if (payload.length < 1) return ctx.respond(ERR_PARSE);

  const tag = payload.raw[0];
  if (tag === 0) {
    // demo path — next task
    return ctx.respond(ERR_PARSE);
  }
  if (tag === 1) {
    // admin path — next task
    return ctx.respond(ERR_PARSE);
  }
  return ctx.respond(ERR_PARSE);
}
