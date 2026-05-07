import {
  Bytes32,
  BytesBlob,
  blake2b256,
  CurrentServiceData,
  Decoder,
  EcalliResult,
  Encoder,
  Preimages,
  RefineArgs,
  RefineContext,
} from "@fluffylabs/as-lan";
import {
  AccumulateCall,
  Assert,
  OperandItem,
  RefineCall,
  Test,
  TestAccumulate,
  TestEcalli,
  TestLookup,
  TestPreimages,
  test,
  unpackResult,
} from "@fluffylabs/as-lan/test";
import { accumulate } from "./accumulate";
import { REFINE_OUTPUT_LEN } from "./constants";
import { refine as dispatch } from "./index";
import { refine } from "./refine";
import { cleanupCursorKey, expiryKey, PasteDigest, PasteEntry, pasteKey } from "./storage";

const SERVICE_ID: u32 = 42;

/** Seed a single operand whose okBlob is the given paste digest, then run accumulate at `slot`. */
function callAccumulateSingle(slot: u32, okBlob: BytesBlob): void {
  TestAccumulate.setItem(0, OperandItem.create().withOkBlob(okBlob).build());
  AccumulateCall.create().withSlot(slot).withServiceId(SERVICE_ID).call(accumulate, 1);
}

/** Run accumulate at `slot` with no items (drives slot-bucket cleanup). */
function callAccumulateEmpty(slot: u32): void {
  AccumulateCall.create().withSlot(slot).withServiceId(SERVICE_ID).call(accumulate, 0);
}

/** Build an okBlob = PasteDigest(hash, length). */
function buildOkBlob(hash: Uint8Array, length: u32): BytesBlob {
  return PasteDigest.create(Bytes32.wrapUnchecked(hash), length).encode();
}

export const TESTS: Test[] = [
  test("refine hashes payload and emits (hash ‖ length_LE)", () => {
    const payload = BytesBlob.parseBlob("0xdeadbeef").okay!;
    const resp = RefineCall.create().call(refine, payload);
    const assert = Assert.create();
    assert.isEqual(resp.result, 0, "result");
    assert.isEqual(resp.data.length, REFINE_OUTPUT_LEN, "data.length");
    if (resp.data.length !== REFINE_OUTPUT_LEN) return assert;
    const op = PasteDigest.decodeOrPanic(resp.data);
    assert.isEqualBytes(op.hash.bytes, BytesBlob.wrap(blake2b256(payload.raw)), "hash");
    assert.isEqual(op.length, <u32>4, "length_LE");
    return assert;
  }),
  test("refine handles empty payload", () => {
    const resp = RefineCall.create().call(refine, BytesBlob.empty());
    const assert = Assert.create();
    assert.isEqual(resp.result, 0, "result");
    assert.isEqual(resp.data.length, REFINE_OUTPUT_LEN, "data.length");
    if (resp.data.length !== REFINE_OUTPUT_LEN) return assert;
    const op = PasteDigest.decodeOrPanic(resp.data);
    assert.isEqualBytes(op.hash.bytes, BytesBlob.wrap(blake2b256(new Uint8Array(0))), "hash");
    assert.isEqual(op.length, <u32>0, "length_LE");
    return assert;
  }),
  test("accumulate solicits, writes paste entry, pushes recent", () => {
    TestEcalli.reset();
    const assert = Assert.create();

    const payload = BytesBlob.zero(8);
    for (let i = 0; i < 8; i += 1) payload.raw[i] = u8(i);
    const hashBytes = blake2b256(payload.raw);
    const okBlob = buildOkBlob(hashBytes, 8);

    callAccumulateSingle(123, okBlob);

    // Paste entry should be present.
    const storage = CurrentServiceData.create();
    const hash = Bytes32.wrapUnchecked(hashBytes);
    const stored = storage.read(pasteKey(hash));
    assert.isEqual(stored.isSome, true, "paste entry present");
    if (!stored.isSome) return assert;
    const raw = stored.val!;
    assert.isEqual(<u32>raw.length, <u32>8, "paste entry length");
    if (raw.length !== 8) return assert;

    const entry = PasteEntry.decodeOrPanic(raw.raw);
    assert.isEqual(entry.slot, <u32>123, "paste entry slot");
    assert.isEqual(entry.length, <u32>8, "paste entry payload length");
    return assert;
  }),
  test("accumulate re-submission is idempotent", () => {
    TestEcalli.reset();
    const assert = Assert.create();

    const payload = BytesBlob.parseBlob("0x01020304").okay!;
    const hashBytes = blake2b256(payload.raw);
    const okBlob = buildOkBlob(hashBytes, 4);

    callAccumulateSingle(100, okBlob);
    callAccumulateSingle(200, okBlob);

    const storage = CurrentServiceData.create();
    const hash = Bytes32.wrapUnchecked(hashBytes);
    const stored = storage.read(pasteKey(hash));
    assert.isEqual(stored.isSome, true, "paste entry present");
    if (!stored.isSome) return assert;

    const entry = PasteEntry.decodeOrPanic(stored.val!.raw);
    // First insertion's slot must be preserved — second call is a no-op.
    assert.isEqual(entry.slot, <u32>100, "paste entry slot preserved");
    assert.isEqual(entry.length, <u32>4, "paste entry payload length");
    return assert;
  }),
  test("accumulate forgets expired pastes once TTL passes", () => {
    TestEcalli.reset();
    const assert = Assert.create();

    const payload = BytesBlob.parseBlob("0xaabb").okay!;
    const hashBytes = blake2b256(payload.raw);
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
    const pasteStored = storage.read(pasteKey(hash));
    assert.isEqual(pasteStored.isSome, false, "paste entry deleted after expiry");

    // Cursor advances by CLEANUP_SLOTS_PER_CALL (=8) on every accumulate
    // invocation: the initial insert + 130 empty calls = 131 × 8 = 1048.
    // Direct-observes the cursor persistence path so a future bug that
    // silently stops writing it can't hide behind the deletion assertion.
    const cursorStored = storage.read(cleanupCursorKey());
    assert.isEqual(cursorStored.isSome, true, "cursor persisted");
    if (cursorStored.isSome) {
      const cursorVal = cursorStored.val!;
      assert.isEqual(<u32>cursorVal.length, <u32>4, "cursor blob length");
      if (cursorVal.length === 4) {
        assert.isEqual(Decoder.fromBytesBlob(cursorVal).u32(), <u32>1048, "cursor value");
      }
    }

    return assert;
  }),
  test("paste → solicit → attach → lookup retrieves blob", () => {
    TestEcalli.reset();
    const assert = Assert.create();

    // 10-byte payload [0xc0..0xc9].
    const payload = BytesBlob.zero(10);
    for (let i: u32 = 0; i < 10; i += 1) payload.raw[i] = u8(0xc0 + i);
    const hashBytes = blake2b256(payload.raw);
    const okBlob = buildOkBlob(hashBytes, 10);

    // Accumulate: inserts paste entry + calls solicit.
    callAccumulateSingle(50, okBlob);

    // Simulate extrinsic delivery (CE 142 gossip + xtpreimages inclusion).
    TestLookup.setAttachedPreimage(Bytes32.wrapUnchecked(hashBytes), payload);

    // Service-visible lookup via the lookup ecalli.
    const preimages = Preimages.create();
    const looked = preimages.lookup(Bytes32.wrapUnchecked(hashBytes));
    assert.isEqual(looked.isSome, true, "preimage looked up");
    if (!looked.isSome) return assert;
    assert.isEqualBytes(looked.val!, payload, "looked-up blob");
    return assert;
  }),
  test("index.ts dispatch routes len==2 to is_authorized, else to refine", () => {
    TestEcalli.reset();
    const assert = Assert.create();

    // len == 2: is_authorized path. Payload is a u16 coreIndex; 0x0000 is fine.
    const coreIndex = BytesBlob.zero(2);
    const authRaw = unpackResult(dispatch(coreIndex.ptr(), coreIndex.length));
    const authResp = RefineContext.create().response.decode(Decoder.fromBlob(authRaw)).okay!;
    assert.isEqual(authResp.result, 0, "is_authorized result");
    assert.isEqual(<u32>authResp.data.length, <u32>0, "is_authorized has no data");

    // len > 2: the refine path. Build a proper RefineArgs encoding and verify
    // the dispatch returns the same 36-byte okBlob that calling refine directly would.
    const payload = BytesBlob.parseBlob("0xdeadbeef").okay!;
    const refResp = RefineCall.create().withServiceId(SERVICE_ID).call(refine, payload);

    // Now call the same bytes via the dispatch function.
    const refArgs = RefineArgs.create(0, 0, SERVICE_ID, payload, Bytes32.zero());
    const enc = Encoder.create();
    RefineContext.create().refineArgs.encode(refArgs, enc);
    const buf = enc.finish();
    const dispRaw = unpackResult(dispatch(buf.ptr(), buf.length));
    const dispResp = RefineContext.create().response.decode(Decoder.fromBlob(dispRaw)).okay!;

    assert.isEqual(dispResp.result, refResp.result, "dispatch result matches direct refine");
    assert.isEqualBytes(dispResp.data, refResp.data, "dispatch data matches refine");
    return assert;
  }),
  test("accumulate skips insertion when solicit returns FULL", () => {
    TestEcalli.reset();
    TestPreimages.setSolicitResult(EcalliResult.FULL);
    const assert = Assert.create();

    const payload = BytesBlob.parseBlob("0x01020304").okay!;
    const hashBytes = blake2b256(payload.raw);
    const okBlob = buildOkBlob(hashBytes, 4);

    callAccumulateSingle(77, okBlob);

    // No paste entry should have been written — insertion is gated on solicit success.
    const storage = CurrentServiceData.create();
    const hash = Bytes32.wrapUnchecked(hashBytes);
    const stored = storage.read(pasteKey(hash));
    assert.isEqual(stored.isSome, false, "paste not stored after solicit failure");
    return assert;
  }),
  test("cleanup forgets both pastes from a shared expiry bucket", () => {
    TestEcalli.reset();
    const assert = Assert.create();

    // Two distinct payloads inserted at the same slot share an expiry bucket.
    const a = BytesBlob.parseBlob("0x010203").okay!;
    const b = BytesBlob.parseBlob("0x090807").okay!;
    const hashA = blake2b256(a.raw);
    const hashB = blake2b256(b.raw);
    const okA = buildOkBlob(hashA, 3);
    const okB = buildOkBlob(hashB, 3);

    // Both at slot 5 → expiry bucket at slot 5 + TTL_SLOTS = 1005.
    callAccumulateSingle(5, okA);
    callAccumulateSingle(5, okB);

    // Pre-cleanup: expiry bucket holds exactly 2 hashes (64 bytes).
    const storage = CurrentServiceData.create();
    const bucket = storage.read(expiryKey(1005));
    assert.isEqual(bucket.isSome, true, "expiry bucket exists pre-cleanup");
    if (bucket.isSome) assert.isEqual(<u32>bucket.val!.length, <u32>64, "bucket holds 2 hashes");

    // Advance cursor past 1005 with empty calls (131 × 8 = 1048 ≥ 1005).
    for (let i: u32 = 0; i < 130; i += 1) callAccumulateEmpty(1005 + i);

    // Both pastes + the bucket itself should be gone.
    assert.isEqual(storage.read(pasteKey(Bytes32.wrapUnchecked(hashA))).isSome, false, "paste A deleted");
    assert.isEqual(storage.read(pasteKey(Bytes32.wrapUnchecked(hashB))).isSome, false, "paste B deleted");
    assert.isEqual(storage.read(expiryKey(1005)).isSome, false, "bucket deleted");
    return assert;
  }),
];
