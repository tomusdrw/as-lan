import { BytesBlob, Decoder, Encoder, ExitReason, Logger, RefineContext, SpiError } from "@fluffylabs/as-lan";
import { AdminCommandCodec } from "./admin";
import { LibraryEntryCodec, libraryKeyFromBlob } from "./storage";

/**
 * Error codes returned in `Response.result` (decoded by the caller).
 *
 * Values live in the `-100..-107` range to avoid overlap with `EcalliResult`
 * sentinels (NONE=-1, OOB=-3, WHO=-4, FULL=-5, HUH=-9) that may appear in the
 * same field when raw ecalli results leak through.
 */
export enum LibraryError {
  UnknownLib = -100,
  PreimageMiss = -101,
  InvalidEntryPoint = -102,
  InvokeFailure = -103,
  Oob = -104,
  AdminMalformed = -105,
  Parse = -106,
  MalformedPreimage = -107,
}

// Cap on the output length the inner PVM may report in r7. Bounds the
// response-buffer allocation so a buggy or malicious library cannot force
// a multi-GB allocation before peek() gets a chance to surface the error.
const MAX_OUTPUT_LEN: u32 = 64 * 1024;

const logger: Logger = Logger.create("library");

export function refine(ptr: u32, len: u32): u64 {
  const ctx = RefineContext.create();
  const args = ctx.parseArgs(ptr, len);
  const payload = args.payload;
  logger.info(`refine: service=${args.serviceId} payloadLen=${payload.length}`);

  if (payload.length < 1) {
    logger.warn("refine: empty payload");
    return ctx.respond(i64(LibraryError.Parse));
  }

  const tag = payload.raw[0];
  const rest = BytesBlob.wrap(payload.raw.subarray(1));

  if (tag === 0) return handleDemo(ctx, rest);
  if (tag === 1) return handleAdmin(ctx, rest);
  logger.warn(`refine: unknown tag ${tag}`);
  return ctx.respond(i64(LibraryError.Parse));
}

function handleDemo(ctx: RefineContext, rest: BytesBlob): u64 {
  const d = Decoder.fromBytesBlob(rest);
  const name = d.bytesVarLen();
  const gas = d.u64();
  const callPayload = d.bytesVarLen();
  if (d.isError) {
    logger.warn("refine demo: input decode failure");
    return ctx.respond(i64(LibraryError.Parse));
  }
  if (!d.isFinished()) {
    logger.warn("refine demo: input trailing bytes");
    return ctx.respond(i64(LibraryError.Parse));
  }
  logger.info(`refine demo: name=${name.toString()} gas=${gas} payloadLen=${callPayload.length}`);

  // Resolve name → LibraryEntry via storage.
  const storage = ctx.serviceData();
  const stored = storage.read(libraryKeyFromBlob(name));
  if (!stored.isSome) {
    logger.warn(`refine demo: unknown library ${name.toString()}`);
    return ctx.respond(i64(LibraryError.UnknownLib));
  }
  const entryDecoder = Decoder.fromBlob(stored.val!.raw);
  const entryR = LibraryEntryCodec.create().decode(entryDecoder);
  if (entryR.isError || !entryDecoder.isFinished()) {
    logger.warn(`refine demo: malformed stored entry for ${name.toString()}`);
    return ctx.respond(i64(LibraryError.UnknownLib));
  }
  const entry = entryR.okay!;
  logger.debug(`refine demo: entry hash=${entry.hash.toString()} len=${entry.length}`);

  // Fetch preimage (historical lookup — required in refine context).
  // Pre-size the helper's buffer to the known preimage length to avoid
  // an initial short-read + auto-expand round trip.
  const preimageOpt = ctx.preimages(entry.length).historicalLookup(entry.hash);
  if (!preimageOpt.isSome) {
    logger.warn(`refine demo: preimage missing for ${name.toString()}`);
    return ctx.respond(i64(LibraryError.PreimageMiss));
  }
  const spiBlob = preimageOpt.val!;
  logger.debug(`refine demo: preimage fetched ${spiBlob.length} bytes`);

  // Preimages are peer-controlled input, so use the Result-returning
  // variant rather than panicking on a malformed blob.
  const vmR = ctx.nestedPvmFromSpiChecked(spiBlob, callPayload, gas);
  if (vmR.isError) {
    const e = vmR.error;
    if (e === SpiError.InvalidEntryPoint) {
      logger.warn("refine demo: invalid entry point");
      return ctx.respond(i64(LibraryError.InvalidEntryPoint));
    }
    logger.warn(`refine demo: malformed SPI preimage error=${e}`);
    return ctx.respond(i64(LibraryError.MalformedPreimage));
  }
  const vm = vmR.okay;

  const reason = vm.invoke();
  if (reason !== ExitReason.Halt) {
    const exitArg = vm.getExitArg();
    logger.warn(`refine demo: invoke non-halt reason=${reason} r8=${exitArg}`);
    vm.expunge();
    const errEnc = Encoder.create();
    errEnc.u8(u8(reason));
    errEnc.u64(u64(exitArg));
    return ctx.respond(i64(LibraryError.InvokeFailure), errEnc.finishRaw());
  }

  // Library output convention: on halt, r7 holds a packed `ptrAndLen`
  // (low 32 = ptr, high 32 = len) pointing at the result bytes in inner
  // memory. Caller peeks them out.
  const r7 = vm.getRegister(7);
  const outAddr: u32 = u32(r7 & 0xffffffff);
  const outLen: u32 = u32(r7 >> 32);
  if (outLen > MAX_OUTPUT_LEN) {
    logger.warn(`refine demo: output length ${outLen} exceeds cap ${MAX_OUTPUT_LEN}`);
    vm.expunge();
    return ctx.respond(i64(LibraryError.Oob));
  }

  const outBuf = BytesBlob.zero(outLen);
  if (outLen > 0) {
    const peekR = vm.peek(outAddr, outBuf);
    if (peekR.isError) {
      logger.warn(`refine demo: peek OOB addr=${outAddr} len=${outLen}`);
      vm.expunge();
      return ctx.respond(i64(LibraryError.Oob));
    }
  }
  vm.expunge();
  logger.info(`refine demo: ok, output ${outLen} bytes`);
  return ctx.respond(0, outBuf.raw);
}

function handleAdmin(ctx: RefineContext, rest: BytesBlob): u64 {
  const codec = AdminCommandCodec.create();
  const d = Decoder.fromBytesBlob(rest);
  const r = codec.decode(d);
  if (r.isError) {
    logger.warn("refine admin: decode failure");
    return ctx.respond(i64(LibraryError.AdminMalformed));
  }
  if (!d.isFinished()) {
    logger.warn("refine admin: trailing bytes");
    return ctx.respond(i64(LibraryError.AdminMalformed));
  }
  logger.info(`refine admin: ok, cmd kind=${r.okay!.kind}`);

  const enc = Encoder.create();
  codec.encode(r.okay!, enc);
  return ctx.respond(0, enc.finishRaw());
}
