import {
  BytesBlob,
  Decoder,
  Encoder,
  ExitReason,
  InvokeIo,
  PageAccess,
  RefineContext,
} from "@fluffylabs/as-lan";
import { AdminCommandCodec } from "./admin";
import { LibraryEntryCodec, libraryKeyFromBlob } from "./storage";

const ERR_UNKNOWN_LIB: i64 = -1;
const ERR_PREIMAGE_MISS: i64 = -2;
const ERR_INVALID_ENTRYPOINT: i64 = -3;
const ERR_INVOKE_FAILURE: i64 = -4;
const ERR_OOB: i64 = -5;
const ERR_ADMIN_MALFORMED: i64 = -6;
const ERR_PARSE: i64 = -7;

const INPUT_ADDR: u32 = 0xfeff0000;
const PAGE_SIZE: u32 = 4096;

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
  const preimageOpt = ctx.preimages().historicalLookup(entry.hash);
  if (!preimageOpt.isSome) return ctx.respond(ERR_PREIMAGE_MISS);
  const code = preimageOpt.val!;

  // Spawn inner machine
  const machineR = ctx.machine(code, entrypoint);
  if (machineR.isError) return ctx.respond(ERR_INVALID_ENTRYPOINT);
  const m = machineR.okay;

  // Allocate RW pages at INPUT_ADDR to fit the payload (at least one page).
  const startPage: u32 = INPUT_ADDR / PAGE_SIZE;
  const pageCount: u32 =
    callPayload.length === 0 ? 1 : (u32(callPayload.length) + PAGE_SIZE - 1) / PAGE_SIZE;
  m.pages(startPage, pageCount, PageAccess.ReadWrite);

  // Poke payload into inner PVM memory.
  const pokeR = m.poke(INPUT_ADDR, callPayload);
  if (pokeR.isError) {
    m.expunge();
    return ctx.respond(ERR_OOB);
  }

  // Build IO (SPI convention: r7 = input ptr, r8 = input len) and invoke.
  const io = InvokeIo.create(gas);
  io.setRegister(7, u64(INPUT_ADDR));
  io.setRegister(8, u64(callPayload.length));
  const outcome = m.invoke(io);

  if (outcome.reason !== ExitReason.Halt) {
    m.expunge();
    const errEnc = Encoder.create();
    errEnc.u8(u8(outcome.reason));
    errEnc.u64(u64(outcome.r8));
    return ctx.respond(ERR_INVOKE_FAILURE, errEnc.finishRaw());
  }

  // Unpack r7 = ptrAndLen (low 32 = ptr, high 32 = len).
  const r7 = io.getRegister(7);
  const outAddr: u32 = u32(r7 & 0xffffffff);
  const outLen: u32 = u32(r7 >> 32);

  const outBuf = BytesBlob.zero(outLen);
  if (outLen > 0) {
    const peekR = m.peek(outAddr, outBuf);
    if (peekR.isError) {
      m.expunge();
      return ctx.respond(ERR_OOB);
    }
  }
  m.expunge();
  return ctx.respond(0, outBuf.raw);
}

function handleAdmin(ctx: RefineContext, rest: BytesBlob): u64 {
  const codec = AdminCommandCodec.create();
  const r = codec.decode(Decoder.fromBlob(rest.raw));
  if (r.isError) return ctx.respond(ERR_ADMIN_MALFORMED);

  const enc = Encoder.create();
  codec.encode(r.okay!, enc);
  return ctx.respond(0, enc.finishRaw());
}
