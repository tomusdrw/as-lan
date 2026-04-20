import { BytesBlob, Decoder, Encoder, RefineContext } from "@fluffylabs/as-lan";
import { AdminCommandCodec } from "./admin";
import { LibraryEntryCodec, libraryKeyFromBlob } from "./storage";

const ERR_UNKNOWN_LIB: i64 = -1;
const ERR_PREIMAGE_MISS: i64 = -2;
const ERR_ADMIN_MALFORMED: i64 = -6;
const ERR_PARSE: i64 = -7;

export function refine(ptr: u32, len: u32): u64 {
  const ctx = RefineContext.create();
  const args = ctx.parseArgs(ptr, len);
  const payload = args.payload;

  if (payload.length < 1) return ctx.respond(ERR_PARSE);

  const tag = payload.raw[0];
  const rest = BytesBlob.wrap(payload.raw.subarray(1));

  if (tag === 0) return handleDemo(ctx, rest);
  if (tag === 1) return handleAdmin(ctx, rest);
  return ctx.respond(ERR_PARSE);
}

function handleDemo(ctx: RefineContext, rest: BytesBlob): u64 {
  const d = Decoder.fromBlob(rest.raw);
  const name = d.bytesVarLen();
  const entrypoint = d.u32();
  const gas = d.u64();
  const callPayload = d.bytesVarLen();
  if (d.isError) return ctx.respond(ERR_PARSE);

  // Resolve name → LibraryEntry via storage
  const storage = ctx.serviceData();
  const stored = storage.read(libraryKeyFromBlob(name));
  if (!stored.isSome) return ctx.respond(ERR_UNKNOWN_LIB);
  const entryR = LibraryEntryCodec.create().decode(Decoder.fromBlob(stored.val!));
  if (entryR.isError) return ctx.respond(ERR_UNKNOWN_LIB);
  const entry = entryR.okay!;

  // Fetch preimage (historical lookup — required in refine context)
  const preimage = ctx.preimages().historicalLookup(entry.hash);
  if (!preimage.isSome) return ctx.respond(ERR_PREIMAGE_MISS);

  // TODO next task: spawn machine, poke payload, invoke, peek, expunge.
  // Keep `entrypoint`, `gas`, `callPayload` for that wiring.
  const _ = entrypoint + u32(gas) + callPayload.length;
  return ctx.respond(0);
}

function handleAdmin(ctx: RefineContext, rest: BytesBlob): u64 {
  const codec = AdminCommandCodec.create();
  const r = codec.decode(Decoder.fromBlob(rest.raw));
  if (r.isError) return ctx.respond(ERR_ADMIN_MALFORMED);

  const enc = Encoder.create();
  codec.encode(r.okay!, enc);
  return ctx.respond(0, enc.finishRaw());
}
