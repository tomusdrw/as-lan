import {
  AccumulateArgs,
  AccumulateContext,
  AccumulateItem,
  Bytes32,
  BytesBlob,
  CurrentServiceData,
  Decoder,
  Encoder,
  Operand,
  RefineArgs,
  RefineContext,
  Response,
  WorkExecResult,
  WorkExecResultKind,
} from "@fluffylabs/as-lan";
import { Assert, Test, test, TestAccumulate, TestEcalli, unpackResult } from "@fluffylabs/as-lan/test";
import { accumulate } from "./accumulate";
import { blake2b256 } from "./crypto/blake2b";
import { refine } from "./refine";
import { cleanupCursorKey, pasteKey, PasteEntry, readU32LE, writeU32LE } from "./storage";
import { assertBytes } from "./test-helpers";

function callRefine(payload: Uint8Array): Response {
  const ctx = RefineContext.create();
  const args = RefineArgs.create(
    0,
    0,
    42,
    BytesBlob.wrap(payload),
    Bytes32.wrapUnchecked(new Uint8Array(32)),
  );
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
  private constructor(public readonly hash: Uint8Array, public readonly length: u32) {}
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
    assertBytes(assert, op.hash, blake2b256(payload), "hash");
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
    assertBytes(assert, op.hash, blake2b256(new Uint8Array(0)), "hash");
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
];
