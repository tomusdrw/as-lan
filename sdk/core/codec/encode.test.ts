import { Assert, Test, test } from "../../test/utils";
import { BytesBlob } from "../bytes";
import { Encoder } from "./encode";

export const TESTS: Test[] = [
  test("encode u8", () => {
    const e = Encoder.create();
    e.u8(0x42);

    const assert = Assert.create();
    assert.isEqual(e.bytesWritten(), 1, "bytesWritten");
    assert.isEqualBytes(e.finish(), BytesBlob.parseBlob("0x42").okay!, "bytes");
    return assert;
  }),

  test("encode u16 little-endian", () => {
    const e = Encoder.create();
    e.u16(0x0102);

    const assert = Assert.create();
    assert.isEqual(e.bytesWritten(), 2, "bytesWritten");
    assert.isEqualBytes(e.finish(), BytesBlob.parseBlob("0x0201").okay!, "bytes");
    return assert;
  }),

  test("encode u32 little-endian", () => {
    const e = Encoder.create();
    e.u32(0x01020304);

    const assert = Assert.create();
    assert.isEqual(e.bytesWritten(), 4, "bytesWritten");
    assert.isEqualBytes(e.finish(), BytesBlob.parseBlob("0x04030201").okay!, "bytes");
    return assert;
  }),

  test("encode u64 little-endian", () => {
    const e = Encoder.create();
    // biome-ignore lint/correctness/noPrecisionLoss: AS u64 literal
    e.u64(0x0102030405060708);

    const assert = Assert.create();
    assert.isEqual(e.bytesWritten(), 8, "bytesWritten");
    assert.isEqualBytes(e.finish(), BytesBlob.parseBlob("0x0807060504030201").okay!, "bytes");
    return assert;
  }),

  test("encode multiple primitives", () => {
    const e = Encoder.create();
    e.u8(0x01);
    e.u16(1234);
    e.u32(0xdeadbeef);

    const assert = Assert.create();
    assert.isEqual(e.bytesWritten(), 7, "bytesWritten");
    assert.isEqualBytes(e.finish(), BytesBlob.parseBlob("0x01d204efbeadde").okay!, "bytes");
    return assert;
  }),

  test("encode varU64 single byte", () => {
    const e = Encoder.create();
    e.varU64(0);
    e.varU64(5);
    e.varU64(127);

    const assert = Assert.create();
    assert.isEqual(e.bytesWritten(), 3, "bytesWritten");
    assert.isEqualBytes(e.finish(), BytesBlob.parseBlob("0x00057f").okay!, "bytes");
    return assert;
  }),

  test("encode varU64 two bytes", () => {
    const e = Encoder.create();
    e.varU64(128);

    const assert = Assert.create();
    assert.isEqual(e.bytesWritten(), 2, "bytesWritten");
    assert.isEqualBytes(e.finish(), BytesBlob.parseBlob("0x8080").okay!, "bytes");
    return assert;
  }),

  test("encode varU64 1234", () => {
    const e = Encoder.create();
    e.varU64(1234);

    const assert = Assert.create();
    assert.isEqual(e.bytesWritten(), 2, "bytesWritten");
    assert.isEqualBytes(e.finish(), BytesBlob.parseBlob("0x84d2").okay!, "bytes");
    return assert;
  }),

  test("encode varU64 three bytes", () => {
    const e = Encoder.create();
    // 16384 = 2^14 → needs 3 bytes (l=2)
    e.varU64(16384);

    const assert = Assert.create();
    assert.isEqual(e.bytesWritten(), 3, "bytesWritten");
    assert.isEqualBytes(e.finish(), BytesBlob.parseBlob("0xc00040").okay!, "bytes");
    return assert;
  }),

  test("encode varU64 nine bytes (max)", () => {
    const e = Encoder.create();
    e.varU64(u64.MAX_VALUE);

    const assert = Assert.create();
    assert.isEqual(e.bytesWritten(), 9, "bytesWritten");
    assert.isEqualBytes(e.finish(), BytesBlob.parseBlob("0xffffffffffffffffff").okay!, "bytes");
    return assert;
  }),

  test("encode bytesFixLen", () => {
    const raw = BytesBlob.parseBlob("0xdeadbeef").okay!;
    const e = Encoder.create();
    e.bytesFixLen(raw);

    const assert = Assert.create();
    assert.isEqual(e.bytesWritten(), 4, "bytesWritten");
    assert.isEqualBytes(e.finish(), raw, "bytes");
    return assert;
  }),

  test("encode bytesFixLen empty", () => {
    const e = Encoder.create();
    e.bytesFixLen(BytesBlob.empty());

    const assert = Assert.create();
    assert.isEqual(e.bytesWritten(), 0, "bytesWritten");
    return assert;
  }),

  test("encode bytesVarLen", () => {
    const blob = BytesBlob.parseBlob("0x1234567890").okay!;
    const e = Encoder.create();
    e.bytesVarLen(blob);

    const assert = Assert.create();
    // 5 bytes payload + 1 byte length prefix
    assert.isEqual(e.bytesWritten(), 6, "bytesWritten");
    assert.isEqualBytes(e.finish(), BytesBlob.parseBlob("0x051234567890").okay!, "bytes");
    return assert;
  }),

  test("encode buffer growth", () => {
    // Start with capacity 4, then write more than 4 bytes
    const e = Encoder.create(4);
    e.u32(0xaabbccdd);
    e.u32(0x11223344);

    const assert = Assert.create();
    assert.isEqual(e.bytesWritten(), 8, "bytesWritten");
    assert.isEqualBytes(e.finish(), BytesBlob.parseBlob("0xddccbbaa44332211").okay!, "bytes");
    return assert;
  }),

  test("into: writes to pre-allocated buffer", () => {
    const buf = BytesBlob.zero(4);
    const e = Encoder.into(buf.raw);
    e.u8(0xaa);
    e.u8(0xbb);
    e.u16(0x1234);

    const assert = Assert.create();
    assert.isEqual(e.isError, false, "no error");
    assert.isEqual(e.bytesWritten(), 4, "bytesWritten");
    assert.isEqualBytes(buf, BytesBlob.parseBlob("0xaabb3412").okay!, "buffer contents");
    return assert;
  }),

  test("into: error on overflow", () => {
    const buf = BytesBlob.zero(2);
    const e = Encoder.into(buf.raw);
    e.u8(0x01);
    e.u32(0xdeadbeef);

    const assert = Assert.create();
    assert.isEqual(e.isError, true, "overflow detected");
    assert.isEqual(e.bytesWritten(), 1, "only first write counted");
    return assert;
  }),

  test("into: subsequent writes skipped after overflow", () => {
    const buf = BytesBlob.zero(3);
    const e = Encoder.into(buf.raw);
    e.u8(0xaa);
    e.u32(0xdeadbeef); // overflows — sets error
    e.u8(0xbb); // should be skipped

    const assert = Assert.create();
    assert.isEqual(e.isError, true, "error set");
    assert.isEqual(e.bytesWritten(), 1, "offset unchanged after error");
    // buffer should only have the first byte written
    assert.isEqualBytes(e.finish(), BytesBlob.parseBlob("0xaa").okay!, "finish returns written portion");
    return assert;
  }),

  test("into: exact fit", () => {
    const buf = BytesBlob.zero(8);
    const e = Encoder.into(buf.raw);
    // biome-ignore lint/correctness/noPrecisionLoss: AS u64 literal
    e.u64(0x0102030405060708);

    const assert = Assert.create();
    assert.isEqual(e.isError, false, "no error");
    assert.isEqual(e.bytesWritten(), 8, "bytesWritten");
    assert.isEqualBytes(buf, BytesBlob.parseBlob("0x0807060504030201").okay!, "bytes");
    return assert;
  }),

  test("into: varU64 overflow", () => {
    const buf = BytesBlob.zero(1);
    const e = Encoder.into(buf.raw);
    e.varU64(128); // needs 2 bytes

    const assert = Assert.create();
    assert.isEqual(e.isError, true, "overflow");
    assert.isEqual(e.bytesWritten(), 0, "nothing written");
    return assert;
  }),
];
