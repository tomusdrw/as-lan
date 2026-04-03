import { Bytes32 } from "../core/bytes";
import { Decoder } from "../core/codec/decode";
import { Encoder } from "../core/codec/encode";
import { Assert, Test, test } from "../test/utils";
import { ACCOUNT_INFO_SIZE, AccountInfo, AccountInfoCodec } from "./account-info";

const _codec: AccountInfoCodec = AccountInfoCodec.create();

function bytes32Fill(v: u8): Bytes32 {
  const raw = new Uint8Array(32);
  raw.fill(v);
  return Bytes32.wrapUnchecked(raw);
}

function roundtrip(original: AccountInfo): AccountInfo {
  const e = Encoder.create();
  _codec.encode(original, e);
  const d = Decoder.fromBlob(e.finish());
  const r = _codec.decode(d);
  assert(r.isOkay, "roundtrip decode failed");
  assert(d.isFinished(), "trailing bytes after decode");
  return r.okay!;
}

export const TESTS: Test[] = [
  test("AccountInfo roundtrip", () => {
    const a = Assert.create();
    const original = AccountInfo.create(
      bytes32Fill(0xab),
      1000,
      500,
      100_000,
      50_000,
      2048,
      10,
      1024,
      7,
      42,
      99,
    );
    const decoded = roundtrip(original);
    a.isEqual(decoded.codeHash.raw[0], 0xab, "codeHash[0]");
    a.isEqual(decoded.codeHash.raw[31], 0xab, "codeHash[31]");
    a.isEqual(decoded.balance, 1000, "balance");
    a.isEqual(decoded.thresholdBalance, 500, "thresholdBalance");
    a.isEqual(decoded.accumulateMinGas, 100_000, "accumulateMinGas");
    a.isEqual(decoded.onTransferMinGas, 50_000, "onTransferMinGas");
    a.isEqual(decoded.storageBytes, 2048, "storageBytes");
    a.isEqual(decoded.storageCount, 10, "storageCount");
    a.isEqual(decoded.gratisStorage, 1024, "gratisStorage");
    a.isEqual(decoded.createdSlot, 7, "createdSlot");
    a.isEqual(decoded.lastAccumulationSlot, 42, "lastAccumulationSlot");
    a.isEqual(decoded.parentService, 99, "parentService");
    return a;
  }),

  test("AccountInfo encoded size is 96 bytes", () => {
    const a = Assert.create();
    const original = AccountInfo.create(
      bytes32Fill(0x00), 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    );
    const e = Encoder.create();
    _codec.encode(original, e);
    const bytes = e.finish();
    a.isEqual(bytes.length, <i32>ACCOUNT_INFO_SIZE, "encoded size");
    return a;
  }),

  test("AccountInfo roundtrip with max values", () => {
    const a = Assert.create();
    const original = AccountInfo.create(
      bytes32Fill(0xff),
      u64.MAX_VALUE,
      u64.MAX_VALUE,
      u64.MAX_VALUE,
      u64.MAX_VALUE,
      u64.MAX_VALUE,
      u32.MAX_VALUE,
      u64.MAX_VALUE,
      u32.MAX_VALUE,
      u32.MAX_VALUE,
      u32.MAX_VALUE,
    );
    const decoded = roundtrip(original);
    a.isEqual(decoded.balance, u64.MAX_VALUE, "balance max");
    a.isEqual(decoded.storageCount, u32.MAX_VALUE, "storageCount max");
    a.isEqual(decoded.parentService, u32.MAX_VALUE, "parentService max");
    return a;
  }),

  test("AccountInfo decode rejects truncated input", () => {
    const a = Assert.create();
    const truncated = new Uint8Array(50);
    const d = Decoder.fromBlob(truncated);
    const r = _codec.decode(d);
    a.isEqual(r.isError, true, "should fail on truncated input");
    return a;
  }),
];
