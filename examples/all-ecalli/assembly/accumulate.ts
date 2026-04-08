import {
  AccumulateContext,
  assign,
  Bytes32,
  BytesBlob,
  // Accumulate ecallis (14-26)
  bless,
  checkpoint,
  designate,
  Encoder,
  eject,
  FetchKind,
  fetch,
  forget,
  // General ecallis (0-5, 100)
  gas,
  info,
  Logger,
  log,
  lookup,
  new_service,
  provide,
  query,
  Response,
  read,
  solicit,
  TRANSFER_MEMO_SIZE,
  transfer,
  upgrade,
  write,
  yield_result,
} from "@fluffylabs/as-lan";
import { AUTO_ACCUM_COUNT, buildAuthQueue, buildAutoAccum, buildValidators } from "./test-data";

const logger: Logger = Logger.create("all-ecalli");

const CURRENT_SERVICE: u32 = u32.MAX_VALUE;

/**
 * Accumulate entry point that invokes every host call available in the
 * accumulate context (general 0-5, 100 + accumulate 14-26) one by one
 * with sensible parameters, collecting results into the response.
 */
export function accumulate(ptr: u32, len: u32): u64 {
  const ctx = AccumulateContext.create();
  const args = ctx.parseArgs(ptr, len);
  logger.info(`accumulate: slot=${args.slot} service=${args.serviceId} argsLength=${args.argsLength}`);

  const out = Encoder.create();
  let count: u32 = 0;

  // ─── Ecalli 0: gas() ──────────────────────────────────────────────
  {
    const r = gas();
    logger.info(`[0] gas() = ${r}`);
    out.varU64(u64(0));
    out.u64(r);
    count++;
  }

  // ─── Ecalli 1: fetch — all accumulate-context kinds (0, 1, 14, 15) ─
  count += fetchAll(out, FetchKind.Constants, "Constants", 0, 0);
  count += fetchAll(out, FetchKind.Entropy, "Entropy", 0, 0);
  count += fetchAll(out, FetchKind.AllTransfersAndOperands, "AllTransfersAndOperands", 0, 0);
  count += fetchAll(out, FetchKind.OneTransferOrOperand, "OneTransferOrOperand", 0, 0);

  // ─── Ecalli 2: lookup(current service, zero hash) ─────────────────
  {
    const hash = Bytes32.zero();
    const buf = BytesBlob.zero(256);
    const r = lookup(CURRENT_SERVICE, hash.ptr(), buf.ptr(), 0, 256);
    logger.info(`[2] lookup() = ${r}`);
    out.varU64(2);
    out.u64(r);
    count++;
  }

  // ─── Ecalli 3: read(current service, key="test") ──────────────────
  {
    const key = BytesBlob.encodeAscii("test");
    const buf = BytesBlob.zero(256);
    const r = read(CURRENT_SERVICE, key.ptr(), key.length, buf.ptr(), 0, buf.length);
    logger.info(`[3] read() = ${r}`);
    out.varU64(3);
    out.u64(r);
    count++;
  }

  // ─── Ecalli 4: write(key="smoke", value="ok") ─────────────────────
  {
    const key = BytesBlob.encodeAscii("smoke");
    const val = BytesBlob.encodeAscii("ok");
    const r = write(key.ptr(), key.length, val.ptr(), val.length);
    logger.info(`[4] write() = ${r}`);
    out.varU64(4);
    out.u64(r);
    count++;
  }

  // ─── Ecalli 5: info(current service) ──────────────────────────────
  {
    const buf = BytesBlob.zero(96);
    const r = info(CURRENT_SERVICE, buf.ptr(), 0, buf.length);
    logger.info(`[5] info() = ${r}`);
    out.varU64(5);
    out.u64(r);
    count++;
  }

  // ─── Ecalli 100: log(level=3 helpful) ─────────────────────────────
  {
    const target = BytesBlob.encodeAscii("all-ecalli");
    const message = BytesBlob.encodeAscii("smoke test");
    const r = log(3, target.ptr(), target.length, message.ptr(), message.length);
    logger.info(`[100] log() = ${r}`);
    out.varU64(100);
    out.u64(u64(r));
    count++;
  }

  // ─── Ecalli 14: bless(manager=1, auth_queue, delegator=2, registrar=3, auto_accum) ──
  {
    const authQueue = buildAuthQueue();
    const autoAccum = buildAutoAccum();
    const r = bless(1, authQueue.ptr(), 2, 3, autoAccum.ptr(), AUTO_ACCUM_COUNT);
    logger.info(`[14] bless() = ${r}`);
    out.varU64(14);
    out.u64(r);
    count++;
  }

  // ─── Ecalli 15: assign(core=0, auth_queue, assigners=0b11) ────────
  {
    const authQueue = buildAuthQueue();
    const r = assign(0, authQueue.ptr(), 0b11);
    logger.info(`[15] assign() = ${r}`);
    out.varU64(15);
    out.u64(r);
    count++;
  }

  // ─── Ecalli 16: designate(validators) ─────────────────────────────
  {
    const validators = buildValidators();
    const r = designate(validators.ptr());
    logger.info(`[16] designate() = ${r}`);
    out.varU64(16);
    out.u64(r);
    count++;
  }

  // ─── Ecalli 17: checkpoint() ──────────────────────────────────────
  {
    const r = checkpoint();
    logger.info(`[17] checkpoint() = ${r}`);
    out.varU64(17);
    out.u64(r);
    count++;
  }

  // ─── Ecalli 18: new_service(code_hash, code_len=1024, gas, allowance) ──
  {
    const codeHash = Bytes32.zero();
    codeHash.raw[0] = 0xaa;
    const r = new_service(codeHash.ptr(), 1024, 100000, 50000, 0, u32.MAX_VALUE);
    logger.info(`[18] new_service() = ${r}`);
    out.varU64(18);
    out.u64(r);
    count++;
  }

  // ─── Ecalli 19: upgrade(code_hash, gas, allowance) ────────────────
  {
    const codeHash = Bytes32.zero();
    codeHash.raw[0] = 0xbb;
    const r = upgrade(codeHash.ptr(), 100000, 50000);
    logger.info(`[19] upgrade() = ${r}`);
    out.varU64(19);
    out.u64(r);
    count++;
  }

  // ─── Ecalli 20: transfer(dest=100, amount=500, gas=1000, memo) ────
  {
    const memo = BytesBlob.zero(TRANSFER_MEMO_SIZE);
    memo.raw[0] = 0x42;
    const r = transfer(100, 500, 1000, memo.ptr());
    logger.info(`[20] transfer() = ${r}`);
    out.varU64(20);
    out.u64(r);
    count++;
  }

  // ─── Ecalli 21: eject(service=99, prev_code_hash) ─────────────────
  {
    const prevCodeHash = Bytes32.zero();
    const r = eject(99, prevCodeHash.ptr());
    logger.info(`[21] eject() = ${r}`);
    out.varU64(21);
    out.u64(r);
    count++;
  }

  // ─── Ecalli 22: query(hash, length=64) ────────────────────────────
  {
    const hash = Bytes32.zero();
    const outR8 = BytesBlob.zero(8);
    const r = query(hash.ptr(), 64, outR8.ptr());
    logger.info(`[22] query() = ${r}`);
    out.varU64(22);
    out.u64(r);
    count++;
  }

  // ─── Ecalli 23: solicit(hash, length=64) ──────────────────────────
  {
    const hash = Bytes32.zero();
    const r = solicit(hash.ptr(), 64);
    logger.info(`[23] solicit() = ${r}`);
    out.varU64(23);
    out.u64(r);
    count++;
  }

  // ─── Ecalli 24: forget(hash, length=64) ───────────────────────────
  {
    const hash = Bytes32.zero();
    const r = forget(hash.ptr(), 64);
    logger.info(`[24] forget() = ${r}`);
    out.varU64(24);
    out.u64(r);
    count++;
  }

  // ─── Ecalli 25: yield_result(hash) ────────────────────────────────
  {
    const hash = Bytes32.zero();
    hash.raw[0] = 0xff;
    const r = yield_result(hash.ptr());
    logger.info(`[25] yield_result() = ${r}`);
    out.varU64(25);
    out.u64(r);
    count++;
  }

  // ─── Ecalli 26: provide(service=42, preimage) ─────────────────────
  {
    const preimage = BytesBlob.zero(16);
    preimage.raw[0] = 0xab;
    preimage.raw[1] = 0xcd;
    const r = provide(42, preimage.ptr(), preimage.length);
    logger.info(`[26] provide() = ${r}`);
    out.varU64(26);
    out.u64(r);
    count++;
  }

  logger.info(`accumulate complete: ${count} ecallis invoked`);

  const results = out.finish();
  const finalEnc = Encoder.create();
  finalEnc.varU64(u64(count));
  finalEnc.bytesFixLen(results);
  return Response.with(i64(count), finalEnc.finish());
}

/** Call fetch with the given kind and record the result. Returns 1. */
function fetchAll(out: Encoder, kind: u32, name: string, param1: u32, param2: u32): u32 {
  const buf = BytesBlob.zero(256);
  const r = fetch(buf.ptr(), 0, buf.length, kind, param1, param2);
  logger.info(`[1] fetch(${name}) = ${r}`);
  out.varU64(1);
  out.u64(r);
  return 1;
}
