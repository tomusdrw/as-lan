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

// ─── Test protocol constants (must match your host configuration) ────
// Auth queue: Q entries × O code hashes × 32 bytes each.
const TEST_Q: u32 = 2; // authorizersQueueSize
const TEST_O: u32 = 2; // maxAuthorizersPerCore
const AUTH_QUEUE_SIZE: u32 = TEST_Q * TEST_O * 32;

// Auto-accumulate: n service IDs × 4 bytes each.
const AUTO_ACCUM_COUNT: u32 = 2;

// Validator key: Ed25519(32) + Bandersnatch(32) + BLS(144) + metadata(128) = 336 bytes.
const VALIDATOR_KEY_SIZE: u32 = 336;
const TEST_V: u32 = 6; // validatorsCount

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

  // ─── Ecalli 14: bless(manager=1, auth_queue, delegator=2, registrar=3, auto_accum) ──
  {
    const authQueue = buildAuthQueue();
    const autoAccum = buildAutoAccum();
    const r = bless(1, u32(authQueue.dataStart), 2, 3, u32(autoAccum.dataStart), AUTO_ACCUM_COUNT);
    logger.info(`[14] bless() = ${r}`);
    out.varU64(14);
    out.u64(r);
    count++;
  }

  // ─── Ecalli 15: assign(core=0, auth_queue, assigners=0b11) ────────
  {
    const authQueue = buildAuthQueue();
    const r = assign(0, u32(authQueue.dataStart), 0b11);
    logger.info(`[15] assign() = ${r}`);
    out.varU64(15);
    out.u64(r);
    count++;
  }

  // ─── Ecalli 16: designate(validators) ─────────────────────────────
  {
    const validators = buildValidators();
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

/**
 * Build a test auth queue: Q×O code hashes (32 bytes each).
 * Each hash is filled with a pattern: byte[0]=queue_slot, byte[1]=auth_index,
 * remaining bytes=0xCC so the host can identify each entry.
 */
function buildAuthQueue(): Uint8Array {
  const buf = new Uint8Array(AUTH_QUEUE_SIZE);
  for (let q: u32 = 0; q < TEST_Q; q++) {
    for (let o: u32 = 0; o < TEST_O; o++) {
      const offset = (q * TEST_O + o) * 32;
      buf[offset] = u8(q);
      buf[offset + 1] = u8(o);
      for (let i: u32 = 2; i < 32; i++) {
        buf[offset + i] = 0xcc;
      }
    }
  }
  return buf;
}

/**
 * Build a test auto-accumulate service list: AUTO_ACCUM_COUNT u32 service IDs.
 * Uses service IDs 100, 200 so they're easy to spot on the host side.
 */
function buildAutoAccum(): Uint8Array {
  const enc = Encoder.into(new Uint8Array(AUTO_ACCUM_COUNT * 4));
  for (let i: u32 = 0; i < AUTO_ACCUM_COUNT; i++) {
    enc.u32((i + 1) * 100);
  }
  return enc.finish();
}

/**
 * Build test validator keys: TEST_V entries, each VALIDATOR_KEY_SIZE bytes.
 * Layout per key: Ed25519(32) + Bandersnatch(32) + BLS(144) + metadata(128).
 * Each section is filled with a marker byte so the host can verify alignment:
 *   Ed25519:     0xE0 | validator_index
 *   Bandersnatch: 0xB0 | validator_index
 *   BLS:         0xBB
 *   metadata:    0xAA
 * Byte[0] of each section additionally encodes the validator index.
 */
function buildValidators(): Uint8Array {
  const buf = new Uint8Array(TEST_V * VALIDATOR_KEY_SIZE);
  for (let v: u32 = 0; v < TEST_V; v++) {
    const base = v * VALIDATOR_KEY_SIZE;
    // Ed25519 (32 bytes)
    for (let i: u32 = 0; i < 32; i++) buf[base + i] = 0xe0 | u8(v);
    // Bandersnatch (32 bytes)
    for (let i: u32 = 0; i < 32; i++) buf[base + 32 + i] = 0xb0 | u8(v);
    // BLS (144 bytes)
    for (let i: u32 = 0; i < 144; i++) buf[base + 64 + i] = 0xbb;
    buf[base + 64] = u8(v); // first byte = validator index
    // metadata (128 bytes)
    for (let i: u32 = 0; i < 128; i++) buf[base + 208 + i] = 0xaa;
    buf[base + 208] = u8(v); // first byte = validator index
  }
  return buf;
}

/** Encode a string as a Uint8Array (UTF-8). */
function encodeString(s: string): Uint8Array {
  const buf = String.UTF8.encode(s);
  return Uint8Array.wrap(buf);
}
