import { Assert, Test, test } from "../test/utils";
import { ByteBuf } from "./byte-buf";
import { BytesBlob } from "./bytes";

/** Compare a Uint8Array against an expected ASCII string (decoded as bytes). */
function assertAscii(a: Assert, actual: Uint8Array, expected: string, msg: string): void {
  a.isEqualBytes(BytesBlob.wrap(actual), BytesBlob.encodeAscii(expected), msg);
}

/** Compare a Uint8Array against an expected raw byte sequence. */
function assertRaw(a: Assert, actual: Uint8Array, expected: u8[], msg: string): void {
  const expectedBytes = BytesBlob.zero(expected.length);
  for (let i = 0; i < expected.length; i++) expectedBytes.raw[i] = expected[i];
  a.isEqualBytes(BytesBlob.wrap(actual), expectedBytes, msg);
}

export const TESTS: Test[] = [
  test("str appends ASCII bytes", () => {
    const a = Assert.create();
    const result = ByteBuf.create(16).strAscii("hello").finish();
    assertAscii(a, result, "hello", "str");
    return a;
  }),

  test("bytes appends raw data", () => {
    const a = Assert.create();
    const data = new Uint8Array(3);
    data[0] = 0xaa;
    data[1] = 0xbb;
    data[2] = 0xcc;
    const result = ByteBuf.create(16).bytes(data).finish();
    assertRaw(a, result, [0xaa, 0xbb, 0xcc], "bytes");
    return a;
  }),

  test("chaining str + bytes + str", () => {
    const a = Assert.create();
    const data = new Uint8Array(2);
    data[0] = 0xff;
    data[1] = 0x01;
    const result = ByteBuf.create(32).strAscii("A=").bytes(data).strAscii("!").finish();
    // "A=" + 0xff 0x01 + "!"
    const expected = BytesBlob.parseBlob("0x413dff0121").okay!;
    a.isEqualBytes(BytesBlob.wrap(result), expected, "chain");
    return a;
  }),

  test("u64 zero", () => {
    const a = Assert.create();
    const result = ByteBuf.create(8).u64(0).finish();
    assertAscii(a, result, "0", "u64(0)");
    return a;
  }),

  test("u64 small value", () => {
    const a = Assert.create();
    const result = ByteBuf.create(8).u64(42).finish();
    assertAscii(a, result, "42", "u64(42)");
    return a;
  }),

  test("u64 large value", () => {
    const a = Assert.create();
    const result = ByteBuf.create(32).u64(u64.MAX_VALUE).finish();
    assertAscii(a, result, "18446744073709551615", "u64 max");
    return a;
  }),

  test("u32 delegates to u64", () => {
    const a = Assert.create();
    const result = ByteBuf.create(16).u32(4294967295).finish();
    assertAscii(a, result, "4294967295", "u32 max");
    return a;
  }),

  test("i32 positive", () => {
    const a = Assert.create();
    const result = ByteBuf.create(8).i32(123).finish();
    assertAscii(a, result, "123", "i32(123)");
    return a;
  }),

  test("i32 negative", () => {
    const a = Assert.create();
    const result = ByteBuf.create(8).i32(-7).finish();
    assertAscii(a, result, "-7", "i32(-7)");
    return a;
  }),

  test("i32 MIN_VALUE", () => {
    const a = Assert.create();
    const result = ByteBuf.create(16).i32(i32.MIN_VALUE).finish();
    assertAscii(a, result, "-2147483648", "i32 min");
    return a;
  }),

  test("i32 zero", () => {
    const a = Assert.create();
    const result = ByteBuf.create(8).i32(0).finish();
    assertAscii(a, result, "0", "i32(0)");
    return a;
  }),

  test("hex with data", () => {
    const a = Assert.create();
    const data = new Uint8Array(3);
    data[0] = 0xde;
    data[1] = 0xad;
    data[2] = 0x09;
    const result = ByteBuf.create(16).hex(data).finish();
    assertAscii(a, result, "0xdead09", "hex");
    return a;
  }),

  test("hex with empty data", () => {
    const a = Assert.create();
    const result = ByteBuf.create(8).hex(new Uint8Array(0)).finish();
    assertAscii(a, result, "0x", "hex empty");
    return a;
  }),

  test("hex all nibble values", () => {
    const a = Assert.create();
    const data = new Uint8Array(1);
    data[0] = 0xaf;
    const result = ByteBuf.create(8).hex(data).finish();
    assertAscii(a, result, "0xaf", "hex 0xaf");
    return a;
  }),

  test("str truncated at capacity", () => {
    const a = Assert.create();
    const result = ByteBuf.create(3).strAscii("hello").finish();
    assertAscii(a, result, "hel", "truncated str");
    return a;
  }),

  test("bytes truncated at capacity", () => {
    const a = Assert.create();
    const data = new Uint8Array(5);
    for (let i = 0; i < 5; i++) data[i] = <u8>(i + 1);
    const result = ByteBuf.create(3).bytes(data).finish();
    assertRaw(a, result, [1, 2, 3], "truncated bytes");
    return a;
  }),

  test("hex truncated drops incomplete byte", () => {
    const a = Assert.create();
    // capacity=5: "0x" (2) + one full byte (2) = 4, second byte needs pos+1 < 5 → fits
    // capacity=6: "0x" (2) + two bytes (4) = 6, but needs pos+1 < cap → only first byte fits
    const data = new Uint8Array(2);
    data[0] = 0xab;
    data[1] = 0xcd;
    const result = ByteBuf.create(6).hex(data).finish();
    // "0x" + "ab" = 4 bytes written, pos=4, need pos+1 < 6 → 5 < 6 → second byte fits
    assertAscii(a, result, "0xabcd", "hex cap=6");

    // With cap=5: "0x" + "ab" = 4 bytes, pos=4, need pos+1 < 5 → 5 < 5 → false, drops cd
    const result2 = ByteBuf.create(5).hex(data).finish();
    assertAscii(a, result2, "0xab", "hex cap=5");
    return a;
  }),

  test("u64 truncated at capacity", () => {
    const a = Assert.create();
    // "12345" needs 5 chars, capacity=3 → truncated to 3 positions.
    // u64 writes right-to-left filling from the end, so the high digits
    // that don't fit are dropped and we get the trailing digits.
    const result = ByteBuf.create(3).u64(12345).finish();
    assertAscii(a, result, "345", "truncated u64");
    return a;
  }),

  test("finish resets for reuse", () => {
    const a = Assert.create();
    const buf = ByteBuf.create(16);
    const first = buf.strAscii("one").finish();
    const second = buf.strAscii("two").finish();
    assertAscii(a, first, "one", "first");
    assertAscii(a, second, "two", "second");
    return a;
  }),

  test("reset discards content", () => {
    const a = Assert.create();
    const buf = ByteBuf.create(16);
    buf.strAscii("discard");
    a.isEqual(buf.length, 7, "length before reset");
    buf.reset();
    a.isEqual(buf.length, 0, "length after reset");
    const result = buf.strAscii("kept").finish();
    assertAscii(a, result, "kept", "after reset");
    return a;
  }),

  test("length tracks position", () => {
    const a = Assert.create();
    const buf = ByteBuf.create(32);
    a.isEqual(buf.length, 0, "initial");
    buf.strAscii("ab");
    a.isEqual(buf.length, 2, "after str");
    buf.u32(7);
    a.isEqual(buf.length, 3, "after u32");
    buf.finish();
    a.isEqual(buf.length, 0, "after finish");
    return a;
  }),

  // ─── wrap() ─────────────────────────────────────────────────────

  test("wrap writes directly into array", () => {
    const a = Assert.create();
    const data = new Uint8Array(5);
    const buf = ByteBuf.wrap(data);
    a.isEqual(buf.length, 0, "initial length");
    a.isEqual(buf.dataStart, data.dataStart, "points to same memory");
    buf.strAscii("Hi");
    a.isEqual(buf.length, 2, "length after write");
    // Backing array should now contain "Hi" + 3 untouched zero bytes.
    const expected = BytesBlob.zero(5);
    expected.raw.set(BytesBlob.encodeAscii("Hi").raw, 0);
    a.isEqualBytes(BytesBlob.wrap(data), expected, "backing array");
    return a;
  }),

  test("wrap truncates at array capacity", () => {
    const a = Assert.create();
    const data = new Uint8Array(3);
    const buf = ByteBuf.wrap(data);
    buf.strAscii("hello"); // 5 chars, only 3 fit
    a.isEqual(buf.length, 3, "length capped");
    a.isEqualBytes(BytesBlob.wrap(data), BytesBlob.encodeAscii("hel"), "backing array");
    return a;
  }),

  test("wrap finish returns copy", () => {
    const a = Assert.create();
    const data = new Uint8Array(8);
    const buf = ByteBuf.wrap(data);
    buf.strAscii("ab");
    const result = buf.finish();
    assertAscii(a, result, "ab", "finish");
    a.isEqual(buf.length, 0, "reset after finish");
    return a;
  }),

  // ─── strUtf8() ──────────────────────────────────────────────────

  test("strUtf8 ASCII string", () => {
    const a = Assert.create();
    const result = ByteBuf.create(16).strUtf8("hello").finish();
    assertAscii(a, result, "hello", "utf8 ascii");
    return a;
  }),

  test("strUtf8 multibyte chars", () => {
    const a = Assert.create();
    // "\u00A2" = U+00A2 = 0xC2 0xA2 in UTF-8 (2 bytes)
    const result = ByteBuf.create(16).strUtf8("\u00A2").finish();
    a.isEqualBytes(BytesBlob.wrap(result), BytesBlob.parseBlob("0xc2a2").okay!, "\u00A2");
    return a;
  }),

  test("strUtf8 truncated at capacity", () => {
    const a = Assert.create();
    // "\u00A2" is 2 bytes, capacity 1 → only first byte fits
    const result = ByteBuf.create(1).strUtf8("\u00A2").finish();
    a.isEqualBytes(BytesBlob.wrap(result), BytesBlob.parseBlob("0xc2").okay!, "first byte of ¢");
    return a;
  }),

  test("strUtf8 mixed with strAscii", () => {
    const a = Assert.create();
    const result = ByteBuf.create(32).strAscii("a=").strUtf8("\u00A2").strAscii("!").finish();
    // "a=" (0x61 0x3d) + "\u00A2" (0xc2 0xa2) + "!" (0x21)
    a.isEqualBytes(BytesBlob.wrap(result), BytesBlob.parseBlob("0x613dc2a221").okay!, "mixed");
    return a;
  }),
];
