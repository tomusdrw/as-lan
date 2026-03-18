import { Bytes32, BytesBlob } from "../core/bytes";
import { Decoder } from "../core/codec/decode";
import { Encoder } from "../core/codec/encode";
import { Assert, Test, test } from "../test/utils";
import {
  AccumulateItemKind,
  Operand,
  PendingTransfer,
  TRANSFER_MEMO_SIZE,
  WorkExecResult,
  WorkExecResultKind,
} from "./accumulate-item";

/** Helper: create a Bytes32 filled with a repeating byte. */
function bytes32Fill(v: u8): Bytes32 {
  const raw = new Uint8Array(32);
  raw.fill(v);
  return Bytes32.wrapUnchecked(raw);
}

/** Helper: encode to bytes, then decode back. */
function roundtripWorkExecResult(original: WorkExecResult): WorkExecResult {
  const e = Encoder.create();
  original.encode(e);
  const d = Decoder.fromBlob(e.finish());
  return WorkExecResult.decode(d);
}

export const TESTS: Test[] = [
  // ─── WorkExecResult ───

  test("WorkExecResult roundtrip Ok with blob", () => {
    const blob = BytesBlob.parseBlob("0xdeadbeefcafe").okay!;
    const original = new WorkExecResult(WorkExecResultKind.Ok, blob);

    const e = Encoder.create();
    original.encode(e);
    const d = Decoder.fromBlob(e.finish());
    const decoded = WorkExecResult.decode(d);

    const assert = new Assert();
    assert.isEqual(decoded.kind, WorkExecResultKind.Ok, "kind");
    assert.isEqual(decoded.isOk, true, "isOk");
    assert.isEqualBytes(decoded.okBlob, blob, "okBlob");
    assert.isEqual(d.isFinished(), true, "finished");
    assert.isEqual(d.isError, false, "no error");
    return assert;
  }),

  test("WorkExecResult roundtrip Ok with empty blob", () => {
    const original = new WorkExecResult(WorkExecResultKind.Ok, BytesBlob.empty());
    const decoded = roundtripWorkExecResult(original);

    const assert = new Assert();
    assert.isEqual(decoded.kind, WorkExecResultKind.Ok, "kind");
    assert.isEqualBytes(decoded.okBlob, BytesBlob.empty(), "empty okBlob");
    return assert;
  }),

  test("WorkExecResult roundtrip OutOfGas", () => {
    const decoded = roundtripWorkExecResult(new WorkExecResult(WorkExecResultKind.OutOfGas, BytesBlob.empty()));
    const assert = new Assert();
    assert.isEqual(decoded.kind, WorkExecResultKind.OutOfGas, "kind");
    assert.isEqual(decoded.isOk, false, "isOk");
    assert.isEqualBytes(decoded.okBlob, BytesBlob.empty(), "okBlob empty");
    return assert;
  }),

  test("WorkExecResult roundtrip all error kinds", () => {
    const kinds: WorkExecResultKind[] = [
      WorkExecResultKind.Panic,
      WorkExecResultKind.IncorrectNumberOfExports,
      WorkExecResultKind.DigestTooBig,
      WorkExecResultKind.BadCode,
      WorkExecResultKind.CodeOversize,
    ];

    const assert = new Assert();
    for (let i = 0; i < kinds.length; i++) {
      const decoded = roundtripWorkExecResult(new WorkExecResult(kinds[i], BytesBlob.empty()));
      assert.isEqual(decoded.kind, kinds[i], `kind[${i}]`);
      assert.isEqual(decoded.isOk, false, `isOk[${i}]`);
    }
    return assert;
  }),

  // ─── Operand ───

  test("Operand roundtrip with Ok result", () => {
    const blob = BytesBlob.parseBlob("0xaabbccdd").okay!;
    const authOut = BytesBlob.parseBlob("0x1234").okay!;
    const original = new Operand(
      bytes32Fill(0x01),
      bytes32Fill(0x02),
      bytes32Fill(0x03),
      bytes32Fill(0x04),
      1000,
      new WorkExecResult(WorkExecResultKind.Ok, blob),
      authOut,
    );

    const e = Encoder.create();
    original.encode(e);
    const d = Decoder.fromBlob(e.finish());
    const decoded = Operand.decode(d);

    const assert = new Assert();
    assert.isEqualBytes(BytesBlob.wrap(decoded.hash.raw), BytesBlob.wrap(bytes32Fill(0x01).raw), "hash");
    assert.isEqualBytes(BytesBlob.wrap(decoded.exportsRoot.raw), BytesBlob.wrap(bytes32Fill(0x02).raw), "exportsRoot");
    assert.isEqualBytes(
      BytesBlob.wrap(decoded.authorizerHash.raw),
      BytesBlob.wrap(bytes32Fill(0x03).raw),
      "authorizerHash",
    );
    assert.isEqualBytes(BytesBlob.wrap(decoded.payloadHash.raw), BytesBlob.wrap(bytes32Fill(0x04).raw), "payloadHash");
    assert.isEqual(decoded.gas, 1000, "gas");
    assert.isEqual(decoded.result.kind, WorkExecResultKind.Ok, "result kind");
    assert.isEqualBytes(decoded.result.okBlob, blob, "result okBlob");
    assert.isEqualBytes(decoded.authorizationOutput, authOut, "authorizationOutput");
    assert.isEqual(d.isFinished(), true, "finished");
    assert.isEqual(d.isError, false, "no error");
    return assert;
  }),

  test("Operand roundtrip with empty authorizationOutput", () => {
    const original = new Operand(
      bytes32Fill(0xaa),
      bytes32Fill(0xbb),
      bytes32Fill(0xcc),
      bytes32Fill(0xdd),
      42,
      new WorkExecResult(WorkExecResultKind.Panic, BytesBlob.empty()),
      BytesBlob.empty(),
    );

    const e = Encoder.create();
    original.encode(e);
    const d = Decoder.fromBlob(e.finish());
    const decoded = Operand.decode(d);

    const assert = new Assert();
    assert.isEqual(decoded.gas, 42, "gas");
    assert.isEqual(decoded.result.kind, WorkExecResultKind.Panic, "result kind");
    assert.isEqualBytes(decoded.authorizationOutput, BytesBlob.empty(), "empty authOut");
    assert.isEqual(d.isFinished(), true, "finished");
    return assert;
  }),

  test("Operand encodeTagged roundtrip", () => {
    const original = new Operand(
      bytes32Fill(0x11),
      bytes32Fill(0x22),
      bytes32Fill(0x33),
      bytes32Fill(0x44),
      500,
      new WorkExecResult(WorkExecResultKind.Ok, BytesBlob.parseBlob("0xff").okay!),
      BytesBlob.parseBlob("0xab").okay!,
    );

    const e = Encoder.create();
    original.encodeTagged(e);
    const d = Decoder.fromBlob(e.finish());

    const assert = new Assert();
    const tag = u32(d.varU64());
    assert.isEqual(tag, AccumulateItemKind.Operand, "tag");

    const decoded = Operand.decode(d);
    assert.isEqualBytes(BytesBlob.wrap(decoded.hash.raw), BytesBlob.wrap(bytes32Fill(0x11).raw), "hash");
    assert.isEqual(decoded.gas, 500, "gas");
    assert.isEqual(decoded.result.kind, WorkExecResultKind.Ok, "result kind");
    assert.isEqual(d.isFinished(), true, "finished");
    return assert;
  }),

  // ─── PendingTransfer ───

  test("PendingTransfer roundtrip with full memo", () => {
    const memo = new Uint8Array(TRANSFER_MEMO_SIZE);
    for (let i: u32 = 0; i < TRANSFER_MEMO_SIZE; i++) {
      memo[i] = u8(i & 0xff);
    }
    const original = new PendingTransfer(100, 200, 999999, BytesBlob.wrap(memo), 50000);

    const e = Encoder.create();
    original.encode(e);
    const d = Decoder.fromBlob(e.finish());
    const decoded = PendingTransfer.decode(d);

    const assert = new Assert();
    assert.isEqual(decoded.source, 100, "source");
    assert.isEqual(decoded.destination, 200, "destination");
    assert.isEqual(decoded.amount, 999999, "amount");
    assert.isEqualBytes(decoded.memo, BytesBlob.wrap(memo), "memo");
    assert.isEqual(decoded.gas, 50000, "gas");
    assert.isEqual(d.isFinished(), true, "finished");
    assert.isEqual(d.isError, false, "no error");
    return assert;
  }),

  test("PendingTransfer roundtrip with short memo (zero-padded)", () => {
    const shortMemo = BytesBlob.parseBlob("0xdeadbeef").okay!;
    const original = new PendingTransfer(1, 2, 100, shortMemo, 500);

    const e = Encoder.create();
    original.encode(e);
    const d = Decoder.fromBlob(e.finish());
    const decoded = PendingTransfer.decode(d);

    // After encode/decode, the memo should be 128 bytes (zero-padded).
    const expectedMemo = new Uint8Array(TRANSFER_MEMO_SIZE);
    expectedMemo.set(shortMemo.raw);

    const assert = new Assert();
    assert.isEqual(decoded.source, 1, "source");
    assert.isEqual(decoded.destination, 2, "destination");
    assert.isEqual(decoded.amount, 100, "amount");
    assert.isEqualBytes(decoded.memo, BytesBlob.wrap(expectedMemo), "padded memo");
    assert.isEqual(decoded.gas, 500, "gas");
    assert.isEqual(d.isFinished(), true, "finished");
    return assert;
  }),

  test("PendingTransfer roundtrip with empty memo", () => {
    const original = new PendingTransfer(0, 0xffffffff, u64.MAX_VALUE, BytesBlob.empty(), 0);

    const e = Encoder.create();
    original.encode(e);
    const d = Decoder.fromBlob(e.finish());
    const decoded = PendingTransfer.decode(d);

    const assert = new Assert();
    assert.isEqual(decoded.source, 0, "source zero");
    assert.isEqual(decoded.destination, 0xffffffff, "destination max");
    assert.isEqual(decoded.amount, u64.MAX_VALUE, "amount max");
    assert.isEqualBytes(decoded.memo, BytesBlob.wrap(new Uint8Array(TRANSFER_MEMO_SIZE)), "zero memo");
    assert.isEqual(decoded.gas, 0, "gas zero");
    assert.isEqual(d.isFinished(), true, "finished");
    return assert;
  }),

  test("PendingTransfer encodeTagged roundtrip", () => {
    const original = new PendingTransfer(10, 20, 300, BytesBlob.empty(), 400);

    const e = Encoder.create();
    original.encodeTagged(e);
    const d = Decoder.fromBlob(e.finish());

    const assert = new Assert();
    const tag = u32(d.varU64());
    assert.isEqual(tag, AccumulateItemKind.Transfer, "tag");

    const decoded = PendingTransfer.decode(d);
    assert.isEqual(decoded.source, 10, "source");
    assert.isEqual(decoded.destination, 20, "destination");
    assert.isEqual(decoded.amount, 300, "amount");
    assert.isEqual(decoded.gas, 400, "gas");
    assert.isEqual(d.isFinished(), true, "finished");
    return assert;
  }),
];
