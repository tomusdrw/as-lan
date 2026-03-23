import { Assert, Test, test } from "../../test/utils";
import { Bytes32, BytesBlob } from "../bytes";
import { Result } from "../result";
import { DecodeError, Decoder, TryDecode } from "./decode";
import { Encoder, TryEncode } from "./encode";

class Point {
  constructor(
    public x: u32 = 0,
    public y: u32 = 0,
  ) {}
}

class PointCodec implements TryDecode<Point>, TryEncode<Point> {
  static create(): PointCodec {
    return new PointCodec();
  }
  private constructor() {}

  encode(value: Point, e: Encoder): void {
    e.u32(value.x);
    e.u32(value.y);
  }

  decode(d: Decoder): Result<Point, DecodeError> {
    const x = d.u32();
    const y = d.u32();
    if (d.isError) {
      return Result.err<Point, DecodeError>(DecodeError.MissingBytes);
    }
    return Result.ok<Point, DecodeError>(new Point(x, y));
  }
}

export const TESTS: Test[] = [
  test("roundtrip u8", () => {
    const e = Encoder.create();
    e.u8(0);
    e.u8(0x42);
    e.u8(0xff);

    const d = Decoder.fromBlob(e.finish());
    const assert = Assert.create();
    assert.isEqual(d.u8(), 0, "zero");
    assert.isEqual(d.u8(), 0x42, "0x42");
    assert.isEqual(d.u8(), 0xff, "max");
    assert.isEqual(d.isFinished(), true, "finished");
    assert.isEqual(d.isError, false, "no error");
    return assert;
  }),

  test("roundtrip u16", () => {
    const e = Encoder.create();
    e.u16(0);
    e.u16(1234);
    e.u16(0xffff);

    const d = Decoder.fromBlob(e.finish());
    const assert = Assert.create();
    assert.isEqual(d.u16(), 0, "zero");
    assert.isEqual(d.u16(), 1234, "1234");
    assert.isEqual(d.u16(), 0xffff, "max");
    assert.isEqual(d.isFinished(), true, "finished");
    assert.isEqual(d.isError, false, "no error");
    return assert;
  }),

  test("roundtrip u32", () => {
    const e = Encoder.create();
    e.u32(0);
    e.u32(0xdeadbeef);
    e.u32(0xffffffff);

    const d = Decoder.fromBlob(e.finish());
    const assert = Assert.create();
    assert.isEqual(d.u32(), 0, "zero");
    assert.isEqual(d.u32(), 0xdeadbeef, "deadbeef");
    assert.isEqual(d.u32(), 0xffffffff, "max");
    assert.isEqual(d.isFinished(), true, "finished");
    assert.isEqual(d.isError, false, "no error");
    return assert;
  }),

  test("roundtrip u64", () => {
    const e = Encoder.create();
    e.u64(0);
    // biome-ignore lint/correctness/noPrecisionLoss: AS u64 literal
    e.u64(0x0102030405060708);
    e.u64(u64.MAX_VALUE);

    const d = Decoder.fromBlob(e.finish());
    const assert = Assert.create();
    assert.isEqual(d.u64(), 0, "zero");
    // biome-ignore lint/correctness/noPrecisionLoss: AS u64 literal
    assert.isEqual(d.u64(), 0x0102030405060708, "multi");
    assert.isEqual(d.u64(), u64.MAX_VALUE, "max");
    assert.isEqual(d.isFinished(), true, "finished");
    assert.isEqual(d.isError, false, "no error");
    return assert;
  }),

  test("roundtrip varU64 boundaries", () => {
    const values: u64[] = [
      0, // 1 byte
      1, // 1 byte
      127, // 1 byte (max single)
      128, // 2 bytes (min two)
      1234, // 2 bytes
      16383, // 2 bytes (max two: 2^14-1)
      16384, // 3 bytes (min three: 2^14)
      0x001fffff, // 3 bytes (max three: 2^21-1)
      0x00200000, // 4 bytes (min four: 2^21)
      0x0fffffff, // 4 bytes (max four: 2^28-1)
      0x10000000, // 5 bytes (min five: 2^28)
    ];

    const e = Encoder.create();
    for (let i = 0; i < values.length; i++) {
      e.varU64(values[i]);
    }

    const d = Decoder.fromBlob(e.finish());
    const assert = Assert.create();
    for (let i = 0; i < values.length; i++) {
      assert.isEqual(d.varU64(), values[i], `value[${i}]`);
    }
    assert.isEqual(d.isFinished(), true, "finished");
    assert.isEqual(d.isError, false, "no error");
    return assert;
  }),

  test("roundtrip varU64 large values", () => {
    const values: u64[] = [
      0x0100000000000000 - 1, // 8 bytes (max seven: 2^56-1)
      0x0100000000000000, // 9 bytes (min eight: 2^56)
      u64.MAX_VALUE, // 9 bytes
    ];

    const e = Encoder.create();
    for (let i = 0; i < values.length; i++) {
      e.varU64(values[i]);
    }

    const d = Decoder.fromBlob(e.finish());
    const assert = Assert.create();
    for (let i = 0; i < values.length; i++) {
      assert.isEqual(d.varU64(), values[i], `value[${i}]`);
    }
    assert.isEqual(d.isFinished(), true, "finished");
    assert.isEqual(d.isError, false, "no error");
    return assert;
  }),

  test("roundtrip bytesFixLen", () => {
    const raw = BytesBlob.parseBlob("0xdeadbeefcafebabe").okay!;

    const e = Encoder.create();
    e.bytesFixLen(raw.raw);

    const d = Decoder.fromBlob(e.finish());
    const assert = Assert.create();
    assert.isEqualBytes(d.bytesFixLen(8), raw, "bytes");
    assert.isEqual(d.isFinished(), true, "finished");
    assert.isEqual(d.isError, false, "no error");
    return assert;
  }),

  test("roundtrip bytesVarLen", () => {
    const blob = BytesBlob.parseBlob("0x1234567890abcdef").okay!;

    const e = Encoder.create();
    e.bytesVarLen(blob);

    const d = Decoder.fromBlob(e.finish());
    const assert = Assert.create();
    assert.isEqualBytes(d.bytesVarLen(), blob, "blob");
    assert.isEqual(d.isFinished(), true, "finished");
    assert.isEqual(d.isError, false, "no error");
    return assert;
  }),

  test("roundtrip bytes32", () => {
    const raw = BytesBlob.parseBlob("0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef").okay!;
    const b32 = Bytes32.wrapUnchecked(raw.raw);

    const e = Encoder.create();
    e.bytes32(b32);

    const d = Decoder.fromBlob(e.finish());
    const assert = Assert.create();
    const decoded = d.bytes32();
    assert.isEqualBytes(BytesBlob.wrap(decoded.raw), raw, "bytes32");
    assert.isEqual(d.isFinished(), true, "finished");
    assert.isEqual(d.isError, false, "no error");
    return assert;
  }),

  test("roundtrip object", () => {
    const codec = PointCodec.create();
    const point = new Point(42, 99);

    const e = Encoder.create();
    e.object(codec, point);

    const d = Decoder.fromBlob(e.finish());
    const assert = Assert.create();
    const result = d.object<Point>(codec);
    assert.isEqual(result.isOkay, true, "decoded ok");
    assert.isEqual(result.okay!.x, 42, "x");
    assert.isEqual(result.okay!.y, 99, "y");
    assert.isEqual(d.isFinished(), true, "finished");
    assert.isEqual(d.isError, false, "no error");
    return assert;
  }),

  test("roundtrip optional present", () => {
    const codec = PointCodec.create();

    const e = Encoder.create();
    e.optional<Point>(codec, new Point(10, 20));

    const d = Decoder.fromBlob(e.finish());
    const assert = Assert.create();
    const result = d.optional<Point>(codec);
    assert.isEqual(result.isOkay, true, "decoded ok");
    const val = result.okay!;
    assert.isEqual(val !== null, true, "is some");
    assert.isEqual(val.x, 10, "x");
    assert.isEqual(val.y, 20, "y");
    assert.isEqual(d.isFinished(), true, "finished");
    return assert;
  }),

  test("roundtrip optional absent", () => {
    const codec = PointCodec.create();

    const e = Encoder.create();
    e.optional<Point>(codec, null);

    const d = Decoder.fromBlob(e.finish());
    const assert = Assert.create();
    const result = d.optional<Point>(codec);
    assert.isEqual(result.isOkay, true, "decoded ok");
    assert.isEqual(result.okay === null, true, "is none");
    assert.isEqual(d.isFinished(), true, "finished");
    return assert;
  }),

  test("roundtrip mixed", () => {
    const blob = BytesBlob.parseBlob("0xcafe").okay!;

    const e = Encoder.create();
    e.u8(1);
    e.u16(1234);
    e.varU64(9999);
    e.bytesVarLen(blob);
    e.u64(0xaabbccdd);

    const d = Decoder.fromBlob(e.finish());
    const assert = Assert.create();
    assert.isEqual(d.u8(), 1, "u8");
    assert.isEqual(d.u16(), 1234, "u16");
    assert.isEqual(d.varU64(), 9999, "varU64");
    assert.isEqualBytes(d.bytesVarLen(), blob, "blob");
    assert.isEqual(d.u64(), 0xaabbccdd, "u64");
    assert.isEqual(d.isFinished(), true, "finished");
    assert.isEqual(d.isError, false, "no error");
    return assert;
  }),
];
