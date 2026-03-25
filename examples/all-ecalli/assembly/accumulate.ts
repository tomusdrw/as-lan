import {
  AccumulateContext,
  assign,
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

const logger: Logger = Logger.create("all-ecalli");

/**
 * Accumulate entry point that invokes every host call available in the
 * accumulate context (general 0-5, 100 + accumulate 14-26) one by one
 * with sensible parameters, collecting results into the response.
 */
export function accumulate(ptr: u32, len: u32): u64 {
  const ctx = AccumulateContext.create();
  const result = ctx.parseArgs(ptr, len);
  if (result.isError) {
    logger.warn(`Failed to parse accumulate args: ${result.error}`);
    return 0;
  }

  const args = result.okay!;
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
    const hash = new Uint8Array(32);
    const buf = new Uint8Array(256);
    const r = lookup(u32.MAX_VALUE, u32(hash.dataStart), u32(buf.dataStart), 0, 256);
    logger.info(`[2] lookup() = ${r}`);
    out.varU64(2);
    out.u64(r);
    count++;
  }

  // ─── Ecalli 3: read(current service, key="test") ──────────────────
  {
    const key = encodeString("test");
    const buf = new Uint8Array(256);
    const r = read(u32.MAX_VALUE, u32(key.dataStart), key.byteLength, u32(buf.dataStart), 0, 256);
    logger.info(`[3] read() = ${r}`);
    out.varU64(3);
    out.u64(r);
    count++;
  }

  // ─── Ecalli 4: write(key="smoke", value="ok") ─────────────────────
  {
    const key = encodeString("smoke");
    const val = encodeString("ok");
    const r = write(u32(key.dataStart), key.byteLength, u32(val.dataStart), val.byteLength);
    logger.info(`[4] write() = ${r}`);
    out.varU64(4);
    out.u64(r);
    count++;
  }

  // ─── Ecalli 5: info(current service) ──────────────────────────────
  {
    const buf = new Uint8Array(96);
    const r = info(u32.MAX_VALUE, u32(buf.dataStart), 0, 96);
    logger.info(`[5] info() = ${r}`);
    out.varU64(5);
    out.u64(r);
    count++;
  }

  // ─── Ecalli 100: log(level=3 helpful) ─────────────────────────────
  {
    const target = encodeString("all-ecalli");
    const message = encodeString("smoke test");
    const r = log(3, u32(target.dataStart), target.byteLength, u32(message.dataStart), message.byteLength);
    logger.info(`[100] log() = ${r}`);
    out.varU64(100);
    out.u64(i64(r));
    count++;
  }

  // ─── Ecalli 14: bless(manager, auth_queue, delegator, registrar, auto_accum) ──
  {
    const authQueue = new Uint8Array(0);
    const autoAccum = new Uint8Array(0);
    const r = bless(1, u32(authQueue.dataStart), 2, 3, u32(autoAccum.dataStart), 0);
    logger.info(`[14] bless() = ${r}`);
    out.varU64(14);
    out.u64(r);
    count++;
  }

  // ─── Ecalli 15: assign(core=0, auth_queue, assigners=1) ───────────
  {
    const authQueue = new Uint8Array(0);
    const r = assign(0, u32(authQueue.dataStart), 1);
    logger.info(`[15] assign() = ${r}`);
    out.varU64(15);
    out.u64(r);
    count++;
  }

  // ─── Ecalli 16: designate(validators) ─────────────────────────────
  {
    const validators = new Uint8Array(0);
    const r = designate(u32(validators.dataStart));
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
    const codeHash = new Uint8Array(32);
    codeHash[0] = 0xaa;
    const r = new_service(u32(codeHash.dataStart), 1024, 100000, 50000, 0, u32.MAX_VALUE);
    logger.info(`[18] new_service() = ${r}`);
    out.varU64(18);
    out.u64(r);
    count++;
  }

  // ─── Ecalli 19: upgrade(code_hash, gas, allowance) ────────────────
  {
    const codeHash = new Uint8Array(32);
    codeHash[0] = 0xbb;
    const r = upgrade(u32(codeHash.dataStart), 100000, 50000);
    logger.info(`[19] upgrade() = ${r}`);
    out.varU64(19);
    out.u64(r);
    count++;
  }

  // ─── Ecalli 20: transfer(dest=100, amount=500, gas=1000, memo) ────
  {
    const memo = new Uint8Array(TRANSFER_MEMO_SIZE);
    memo[0] = 0x42;
    const r = transfer(100, 500, 1000, u32(memo.dataStart));
    logger.info(`[20] transfer() = ${r}`);
    out.varU64(20);
    out.u64(r);
    count++;
  }

  // ─── Ecalli 21: eject(service=99, prev_code_hash) ─────────────────
  {
    const prevCodeHash = new Uint8Array(32);
    const r = eject(99, u32(prevCodeHash.dataStart));
    logger.info(`[21] eject() = ${r}`);
    out.varU64(21);
    out.u64(r);
    count++;
  }

  // ─── Ecalli 22: query(hash, length=64) ────────────────────────────
  {
    const hash = new Uint8Array(32);
    const outR8 = new Uint8Array(8);
    const r = query(u32(hash.dataStart), 64, u32(outR8.dataStart));
    logger.info(`[22] query() = ${r}`);
    out.varU64(22);
    out.u64(r);
    count++;
  }

  // ─── Ecalli 23: solicit(hash, length=64) ──────────────────────────
  {
    const hash = new Uint8Array(32);
    const r = solicit(u32(hash.dataStart), 64);
    logger.info(`[23] solicit() = ${r}`);
    out.varU64(23);
    out.u64(r);
    count++;
  }

  // ─── Ecalli 24: forget(hash, length=64) ───────────────────────────
  {
    const hash = new Uint8Array(32);
    const r = forget(u32(hash.dataStart), 64);
    logger.info(`[24] forget() = ${r}`);
    out.varU64(24);
    out.u64(r);
    count++;
  }

  // ─── Ecalli 25: yield_result(hash) ────────────────────────────────
  {
    const hash = new Uint8Array(32);
    hash[0] = 0xff;
    const r = yield_result(u32(hash.dataStart));
    logger.info(`[25] yield_result() = ${r}`);
    out.varU64(25);
    out.u64(r);
    count++;
  }

  // ─── Ecalli 26: provide(service=42, preimage) ─────────────────────
  {
    const preimage = new Uint8Array(16);
    preimage[0] = 0xab;
    preimage[1] = 0xcd;
    const r = provide(42, u32(preimage.dataStart), preimage.byteLength);
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
  const buf = new Uint8Array(256);
  const r = fetch(u32(buf.dataStart), 0, 256, kind, param1, param2);
  logger.info(`[1] fetch(${name}) = ${r}`);
  out.varU64(1);
  out.u64(r);
  return 1;
}

/** Encode a string as a Uint8Array (UTF-8). */
function encodeString(s: string): Uint8Array {
  const buf = String.UTF8.encode(s);
  return Uint8Array.wrap(buf);
}
