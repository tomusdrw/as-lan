import {
  AccumulateArgs,
  AccumulateContext,
  AccumulateItem,
  Bytes32,
  BytesBlob,
  blake2b256,
  CurrentServiceData,
  Decoder,
  EcalliResult,
  Encoder,
  Operand,
  Preimages,
  RefineArgs,
  RefineContext,
  Response,
  WorkExecResult,
  WorkExecResultKind,
} from "@fluffylabs/as-lan";
import {
  Assert,
  Test,
  TestAccumulate,
  TestEcalli,
  TestLookup,
  TestPreimages,
  test,
  unpackResult,
} from "@fluffylabs/as-lan/test";
import { accumulate } from "./accumulate";
import { refine as dispatch } from "./index";
import { refine } from "./refine";
import { cleanupCursorKey, expiryKey, PasteEntry, pasteKey, readU32LE, writeU32LE } from "./storage";

function callRefine(payload: Uint8Array): Response {
  const ctx = RefineContext.create();
  const args = RefineArgs.create(0, 0, 42, BytesBlob.wrap(payload), Bytes32.wrapUnchecked(new Uint8Array(32)));
  const enc = Encoder.create();
  ctx.refineArgs.encode(args, enc);
  const encoded = enc.finishRaw();
  const buf = new Uint8Array(encoded.length);
  buf.set(encoded);
  const raw = unpackResult(refine(u32(buf.dataStart), buf.byteLength));
  return ctx.response.decode(Decoder.fromBlob(raw)).okay!;
}

class DecodedOperand {
  static create(hash: Uint8Array, length: u32): DecodedOperand {
    return new DecodedOperand(hash, length);
  }
  private constructor(
    public readonly hash: Uint8Array,
    public readonly length: u32,
  ) {}
}

function decodeOperand(data: BytesBlob): DecodedOperand {
  const hash = new Uint8Array(32);
  hash.set(data.raw.subarray(0, 32), 0);
  const length: u32 = readU32LE(data.raw, 32);
  return DecodedOperand.create(hash, length);
}

const ZERO_HASH: Bytes32 = Bytes32.wrapUnchecked(new Uint8Array(32));
const SERVICE_ID: u32 = 42;

function buildOperandItem(okBlob: Uint8Array): Uint8Array {
  const ctx = AccumulateContext.create();
  const op = Operand.create(
    ZERO_HASH,
    ZERO_HASH,
    ZERO_HASH,
    ZERO_HASH,
    100000,
    WorkExecResult.create(WorkExecResultKind.Ok, BytesBlob.wrap(okBlob)),
    BytesBlob.empty(),
  );
  const enc = Encoder.create();
  ctx.accumulateItem.encode(AccumulateItem.fromOperand(op), enc);
  return enc.finishRaw();
}

function callAccumulateSingle(slot: u32, okBlob: Uint8Array): void {
  TestAccumulate.setItem(0, buildOperandItem(okBlob));

  const ctx = AccumulateContext.create();
  const args = AccumulateArgs.create(slot, SERVICE_ID, 1);
  const enc = Encoder.create();
  ctx.accumulateArgs.encode(args, enc);
  const encoded = enc.finishRaw();
  const buf = BytesBlob.wrap(encoded);
  unpackResult(accumulate(buf.ptr(), buf.length));
}

function callAccumulateEmpty(slot: u32): void {
  const ctx = AccumulateContext.create();
  const args = AccumulateArgs.create(slot, SERVICE_ID, 0);
  const enc = Encoder.create();
  ctx.accumulateArgs.encode(args, enc);
  const encoded = enc.finishRaw();
  const buf = BytesBlob.wrap(encoded);
  unpackResult(accumulate(buf.ptr(), buf.length));
}

function buildOkBlob(hash: Uint8Array, length: u32): Uint8Array {
  const out = new Uint8Array(36);
  out.set(hash, 0);
  writeU32LE(out, 32, length);
  return out;
}

export const TESTS: Test[] = [
  test("refine hashes payload and emits (hash ‖ length_LE)", () => {
    const payload = new Uint8Array(4);
    payload[0] = 0xde;
    payload[1] = 0xad;
    payload[2] = 0xbe;
    payload[3] = 0xef;
    const resp = callRefine(payload);
    const assert = Assert.create();
    assert.isEqual(resp.result, 0, "result");
    assert.isEqual(resp.data.length, 36, "data.length");
    if (resp.data.length !== 36) return assert;
    const op = decodeOperand(resp.data);
    assert.isEqualBytes(BytesBlob.wrap(op.hash), BytesBlob.wrap(blake2b256(payload)), "hash");
    assert.isEqual(op.length, <u32>4, "length_LE");
    return assert;
  }),
  test("refine handles empty payload", () => {
    const resp = callRefine(new Uint8Array(0));
    const assert = Assert.create();
    assert.isEqual(resp.result, 0, "result");
    assert.isEqual(resp.data.length, 36, "data.length");
    if (resp.data.length !== 36) return assert;
    const op = decodeOperand(resp.data);
    assert.isEqualBytes(BytesBlob.wrap(op.hash), BytesBlob.wrap(blake2b256(new Uint8Array(0))), "hash");
    assert.isEqual(op.length, <u32>0, "length_LE");
    return assert;
  }),
  test("accumulate solicits, writes paste entry, pushes recent", () => {
    TestEcalli.reset();
    const assert = Assert.create();

    const payload = new Uint8Array(8);
    for (let i = 0; i < 8; i += 1) payload[i] = u8(i);
    const hashBytes = blake2b256(payload);
    const okBlob = buildOkBlob(hashBytes, 8);

    callAccumulateSingle(123, okBlob);

    // Paste entry should be present.
    const storage = CurrentServiceData.create();
    const hash = Bytes32.wrapUnchecked(hashBytes);
    const stored = storage.read(pasteKey(hash).raw);
    assert.isEqual(stored.isSome, true, "paste entry present");
    if (!stored.isSome) return assert;
    const raw = stored.val!;
    assert.isEqual(<u32>raw.length, <u32>8, "paste entry length");
    if (raw.length !== 8) return assert;

    const entry = PasteEntry.decodeOrPanic(raw);
    assert.isEqual(entry.slot, <u32>123, "paste entry slot");
    assert.isEqual(entry.length, <u32>8, "paste entry payload length");
    return assert;
  }),
  test("accumulate re-submission is idempotent", () => {
    TestEcalli.reset();
    const assert = Assert.create();

    const payload = new Uint8Array(4);
    payload[0] = 1;
    payload[1] = 2;
    payload[2] = 3;
    payload[3] = 4;
    const hashBytes = blake2b256(payload);
    const okBlob = buildOkBlob(hashBytes, 4);

    callAccumulateSingle(100, okBlob);
    callAccumulateSingle(200, okBlob);

    const storage = CurrentServiceData.create();
    const hash = Bytes32.wrapUnchecked(hashBytes);
    const stored = storage.read(pasteKey(hash).raw);
    assert.isEqual(stored.isSome, true, "paste entry present");
    if (!stored.isSome) return assert;

    const entry = PasteEntry.decodeOrPanic(stored.val!);
    // First insertion's slot must be preserved — second call is a no-op.
    assert.isEqual(entry.slot, <u32>100, "paste entry slot preserved");
    assert.isEqual(entry.length, <u32>4, "paste entry payload length");
    return assert;
  }),
  test("accumulate forgets expired pastes once TTL passes", () => {
    TestEcalli.reset();
    const assert = Assert.create();

    const payload = new Uint8Array(2);
    payload[0] = 0xaa;
    payload[1] = 0xbb;
    const hashBytes = blake2b256(payload);
    const okBlob = buildOkBlob(hashBytes, 2);

    // Insert at slot 10 → scheduled to expire at slot 10 + TTL_SLOTS = 1010.
    callAccumulateSingle(10, okBlob);

    // Advance cleanup cursor past slot 1010 using empty accumulate calls.
    // Each call advances cursor by CLEANUP_SLOTS_PER_CALL = 8. Need ≥ 127 calls.
    for (let i: u32 = 0; i < 130; i += 1) {
      callAccumulateEmpty(1010 + i);
    }

    // Paste entry should be gone.
    const storage = CurrentServiceData.create();
    const hash = Bytes32.wrapUnchecked(hashBytes);
    const pasteStored = storage.read(pasteKey(hash).raw);
    assert.isEqual(pasteStored.isSome, false, "paste entry deleted after expiry");

    // Cursor advances by CLEANUP_SLOTS_PER_CALL (=8) on every accumulate
    // invocation: the initial insert + 130 empty calls = 131 × 8 = 1048.
    // Direct-observes the cursor persistence path so a future bug that
    // silently stops writing it can't hide behind the deletion assertion.
    const cursorStored = storage.read(cleanupCursorKey().raw);
    assert.isEqual(cursorStored.isSome, true, "cursor persisted");
    if (cursorStored.isSome) {
      const cursorVal = cursorStored.val!;
      assert.isEqual(<u32>cursorVal.length, <u32>4, "cursor blob length");
      if (cursorVal.length === 4) {
        assert.isEqual(readU32LE(cursorVal, 0), <u32>1048, "cursor value");
      }
    }

    return assert;
  }),
  test("paste → solicit → attach → lookup retrieves blob", () => {
    TestEcalli.reset();
    const assert = Assert.create();

    // 10-byte payload [0xc0..0xc9].
    const payload = new Uint8Array(10);
    for (let i: u32 = 0; i < 10; i += 1) payload[i] = u8(0xc0 + i);
    const hashBytes = blake2b256(payload);
    const okBlob = buildOkBlob(hashBytes, 10);

    // Accumulate: inserts paste entry + calls solicit.
    callAccumulateSingle(50, okBlob);

    // Simulate extrinsic delivery (CE 142 gossip + xtpreimages inclusion).
    TestLookup.setAttachedPreimage(Bytes32.wrapUnchecked(hashBytes), BytesBlob.wrap(payload));

    // Service-visible lookup via the lookup ecalli.
    const preimages = Preimages.create();
    const looked = preimages.lookup(Bytes32.wrapUnchecked(hashBytes));
    assert.isEqual(looked.isSome, true, "preimage looked up");
    if (!looked.isSome) return assert;
    assert.isEqualBytes(looked.val!, BytesBlob.wrap(payload), "looked-up blob");
    return assert;
  }),
  test("index.ts dispatch routes len==2 to is_authorized, else to refine", () => {
    TestEcalli.reset();
    const assert = Assert.create();

    // len == 2: is_authorized path. Payload is a u16 coreIndex; 0x0000 is fine.
    const coreIndex = new Uint8Array(2);
    const authRaw = unpackResult(dispatch(u32(coreIndex.dataStart), coreIndex.byteLength));
    const authResp = RefineContext.create().response.decode(Decoder.fromBlob(authRaw)).okay!;
    assert.isEqual(authResp.result, 0, "is_authorized result");
    assert.isEqual(<u32>authResp.data.length, <u32>0, "is_authorized has no data");

    // len > 2: the refine path. Build a proper RefineArgs encoding and verify
    // the dispatch returns the same 36-byte okBlob that calling refine directly would.
    const payload = new Uint8Array(4);
    payload[0] = 0xde;
    payload[1] = 0xad;
    payload[2] = 0xbe;
    payload[3] = 0xef;
    const refResp = callRefine(payload); // goes via refine() directly

    // Now call the same bytes via the dispatch function.
    const refArgs = RefineArgs.create(0, 0, SERVICE_ID, BytesBlob.wrap(payload), ZERO_HASH);
    const enc = Encoder.create();
    RefineContext.create().refineArgs.encode(refArgs, enc);
    const encoded = enc.finishRaw();
    const buf = new Uint8Array(encoded.length);
    buf.set(encoded);
    const dispRaw = unpackResult(dispatch(u32(buf.dataStart), buf.byteLength));
    const dispResp = RefineContext.create().response.decode(Decoder.fromBlob(dispRaw)).okay!;

    assert.isEqual(dispResp.result, refResp.result, "dispatch result matches direct refine");
    assert.isEqual(dispResp.data.length, refResp.data.length, "dispatch data length matches");
    assert.isEqualBytes(dispResp.data, refResp.data, "dispatch data matches refine");
    return assert;
  }),
  test("accumulate skips insertion when solicit returns FULL", () => {
    TestEcalli.reset();
    TestPreimages.setSolicitResult(EcalliResult.FULL);
    const assert = Assert.create();

    const payload = new Uint8Array(4);
    payload[0] = 1;
    payload[1] = 2;
    payload[2] = 3;
    payload[3] = 4;
    const hashBytes = blake2b256(payload);
    const okBlob = buildOkBlob(hashBytes, 4);

    callAccumulateSingle(77, okBlob);

    // No paste entry should have been written — insertion is gated on solicit success.
    const storage = CurrentServiceData.create();
    const hash = Bytes32.wrapUnchecked(hashBytes);
    const stored = storage.read(pasteKey(hash).raw);
    assert.isEqual(stored.isSome, false, "paste not stored after solicit failure");
    return assert;
  }),
  test("cleanup forgets both pastes from a shared expiry bucket", () => {
    TestEcalli.reset();
    const assert = Assert.create();

    // Two distinct payloads inserted at the same slot share an expiry bucket.
    const a = new Uint8Array(3);
    a[0] = 1;
    a[1] = 2;
    a[2] = 3;
    const b = new Uint8Array(3);
    b[0] = 9;
    b[1] = 8;
    b[2] = 7;
    const hashA = blake2b256(a);
    const hashB = blake2b256(b);
    const okA = buildOkBlob(hashA, 3);
    const okB = buildOkBlob(hashB, 3);

    // Both at slot 5 → expiry bucket at slot 5 + TTL_SLOTS = 1005.
    callAccumulateSingle(5, okA);
    callAccumulateSingle(5, okB);

    // Pre-cleanup: expiry bucket holds exactly 2 hashes (64 bytes).
    const storage = CurrentServiceData.create();
    const bucket = storage.read(expiryKey(1005).raw);
    assert.isEqual(bucket.isSome, true, "expiry bucket exists pre-cleanup");
    if (bucket.isSome) assert.isEqual(<u32>bucket.val!.length, <u32>64, "bucket holds 2 hashes");

    // Advance cursor past 1005 with empty calls (131 × 8 = 1048 ≥ 1005).
    for (let i: u32 = 0; i < 130; i += 1) callAccumulateEmpty(1005 + i);

    // Both pastes + the bucket itself should be gone.
    assert.isEqual(storage.read(pasteKey(Bytes32.wrapUnchecked(hashA)).raw).isSome, false, "paste A deleted");
    assert.isEqual(storage.read(pasteKey(Bytes32.wrapUnchecked(hashB)).raw).isSome, false, "paste B deleted");
    assert.isEqual(storage.read(expiryKey(1005).raw).isSome, false, "bucket deleted");
    return assert;
  }),
];
