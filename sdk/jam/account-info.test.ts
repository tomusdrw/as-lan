import { ByteBuf } from "../core/byte-buf";
import { Bytes32, BytesBlob } from "../core/bytes";
import { Decoder } from "../core/codec/decode";
import { Encoder } from "../core/codec/encode";
import { TestEcalli, TestInfo, TestStorage } from "../test/test-ecalli";
import { Assert, strBlob, Test, test } from "../test/utils";
import { ACCOUNT_INFO_SIZE, AccountInfo, AccountInfoCodec } from "./account-info";
import { CurrentServiceData, ServiceData } from "./service-data";

const _codec: AccountInfoCodec = AccountInfoCodec.create();

function bytes32Fill(v: u8): Bytes32 {
  const raw = new Uint8Array(32);
  raw.fill(v);
  return Bytes32.wrapUnchecked(raw);
}

function roundtrip(original: AccountInfo): AccountInfo {
  const e = Encoder.create();
  _codec.encode(original, e);
  const d = Decoder.fromBlob(e.finishRaw());
  const r = _codec.decode(d);
  assert(r.isOkay, "roundtrip decode failed");
  assert(d.isFinished(), "trailing bytes after decode");
  return r.okay!;
}

function encodeInfoBytes(info: AccountInfo): Uint8Array {
  const e = Encoder.create();
  _codec.encode(info, e);
  return e.finishRaw();
}

export const TESTS: Test[] = [
  // ─── AccountInfoCodec ───

  test("AccountInfo roundtrip", () => {
    const a = Assert.create();
    const original = AccountInfo.create(bytes32Fill(0xab), 1000, 500, 100_000, 50_000, 2048, 10, 1024, 7, 42, 99);
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
    const original = AccountInfo.create(bytes32Fill(0x00), 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    const e = Encoder.create();
    _codec.encode(original, e);
    const bytes = e.finishRaw();
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

  // ─── ServiceData.info() ───

  test("ServiceData.info returns AccountInfo", () => {
    TestEcalli.reset();
    const a = Assert.create();
    const expected = AccountInfo.create(bytes32Fill(0xcc), 5000, 2500, 200_000, 100_000, 4096, 20, 2048, 10, 50, 77);
    TestInfo.set(42, encodeInfoBytes(expected));

    const svc = ServiceData.create(42);
    const result = svc.info();
    a.isEqual(result.isSome, true, "should be some");
    const info = result.val!;
    a.isEqual(info.codeHash.raw[0], 0xcc, "codeHash");
    a.isEqual(info.balance, 5000, "balance");
    a.isEqual(info.thresholdBalance, 2500, "thresholdBalance");
    a.isEqual(info.accumulateMinGas, 200_000, "accumulateMinGas");
    a.isEqual(info.onTransferMinGas, 100_000, "onTransferMinGas");
    a.isEqual(info.storageBytes, 4096, "storageBytes");
    a.isEqual(info.storageCount, 20, "storageCount");
    a.isEqual(info.gratisStorage, 2048, "gratisStorage");
    a.isEqual(info.createdSlot, 10, "createdSlot");
    a.isEqual(info.lastAccumulationSlot, 50, "lastAccumulationSlot");
    a.isEqual(info.parentService, 77, "parentService");
    return a;
  }),

  test("ServiceData.info returns None for missing service", () => {
    TestEcalli.reset();
    const a = Assert.create();
    TestInfo.setNone(999);

    const svc = ServiceData.create(999);
    const result = svc.info();
    a.isEqual(result.isSome, false, "should be none");
    return a;
  }),

  // ─── ServiceData.read() ───

  test("ServiceData.read returns value for existing key", () => {
    TestEcalli.reset();
    const a = Assert.create();
    const val = new Uint8Array(4);
    val[0] = 0xde;
    val[1] = 0xad;
    val[2] = 0xbe;
    val[3] = 0xef;
    TestStorage.set(strBlob("testkey"), BytesBlob.wrap(val));

    const svc = ServiceData.create(42);
    const key = ByteBuf.create(32).strAscii("testkey").finish();
    const result = svc.read(key);
    a.isEqual(result.isSome, true, "should be some");
    const data = result.val!;
    a.isEqual(data.length, 4, "length");
    a.isEqual(data[0], 0xde, "byte 0");
    a.isEqual(data[1], 0xad, "byte 1");
    a.isEqual(data[2], 0xbe, "byte 2");
    a.isEqual(data[3], 0xef, "byte 3");
    return a;
  }),

  test("ServiceData.read returns None for missing key", () => {
    TestEcalli.reset();
    const a = Assert.create();

    const svc = ServiceData.create(42);
    const key = ByteBuf.create(32).strAscii("nonexistent").finish();
    const result = svc.read(key);
    a.isEqual(result.isSome, false, "should be none");
    return a;
  }),

  test("ServiceData.read auto-expands buffer for large values", () => {
    TestEcalli.reset();
    const a = Assert.create();
    const largeVal = new Uint8Array(2048);
    for (let i = 0; i < 2048; i++) largeVal[i] = u8(i & 0xff);
    TestStorage.set(strBlob("bigkey"), BytesBlob.wrap(largeVal));

    // Create with small buffer (64 bytes) to force auto-expansion
    const svc = ServiceData.create(42, 64);
    const key = ByteBuf.create(32).strAscii("bigkey").finish();
    const result = svc.read(key);
    a.isEqual(result.isSome, true, "should be some");
    const data = result.val!;
    a.isEqual(data.length, 2048, "length");
    a.isEqual(data[0], 0, "byte 0");
    a.isEqual(data[1], 1, "byte 1");
    a.isEqual(data[255], 255, "byte 255");
    a.isEqual(data[256], 0, "byte 256 wraps");
    return a;
  }),

  // ─── CurrentServiceData.write() ───

  test("CurrentServiceData.write returns None for new key", () => {
    TestEcalli.reset();
    const a = Assert.create();

    const svc = CurrentServiceData.create();
    const key = ByteBuf.create(32).strAscii("newkey").finish();
    const val = new Uint8Array(3);
    val[0] = 1;
    val[1] = 2;
    val[2] = 3;
    const result = svc.write(key, val);
    a.isEqual(result.isOkay, true, "should be ok");
    a.isEqual(result.okay!.isSome, false, "no previous value");
    return a;
  }),

  test("CurrentServiceData.write returns previous length on overwrite", () => {
    TestEcalli.reset();
    const a = Assert.create();

    const svc = CurrentServiceData.create();
    const key = ByteBuf.create(32).strAscii("overkey").finish();
    const val1 = new Uint8Array(5);
    val1.fill(0xaa);
    const val2 = new Uint8Array(3);
    val2.fill(0xbb);

    // First write — no previous value
    svc.write(key, val1);

    // Second write — should return previous length (5)
    const key2 = ByteBuf.create(32).strAscii("overkey").finish();
    const result = svc.write(key2, val2);
    a.isEqual(result.isOkay, true, "should be ok");
    a.isEqual(result.okay!.isSome, true, "has previous value");
    a.isEqual(result.okay!.val, 5, "previous length");
    return a;
  }),

  test("CurrentServiceData read/write roundtrip", () => {
    TestEcalli.reset();
    const a = Assert.create();

    const svc = CurrentServiceData.create();
    const key = ByteBuf.create(32).strAscii("rtkey").finish();
    const val = new Uint8Array(4);
    val[0] = 0xca;
    val[1] = 0xfe;
    val[2] = 0xba;
    val[3] = 0xbe;

    svc.write(key, val);

    const key2 = ByteBuf.create(32).strAscii("rtkey").finish();
    const result = svc.read(key2);
    a.isEqual(result.isSome, true, "should be some");
    const data = result.val!;
    a.isEqual(data.length, 4, "length");
    a.isEqual(data[0], 0xca, "byte 0");
    a.isEqual(data[1], 0xfe, "byte 1");
    a.isEqual(data[2], 0xba, "byte 2");
    a.isEqual(data[3], 0xbe, "byte 3");
    return a;
  }),
];
