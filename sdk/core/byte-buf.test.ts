import { Assert, Test, test } from "../test/utils";
import { ByteBuf } from "./byte-buf";

/** Helper: compare a Uint8Array against expected bytes. */
function assertBytes(a: Assert, actual: Uint8Array, expected: u8[], msg: string): void {
  a.isEqual(actual.length, expected.length, `${msg}.length`);
  for (let i = 0; i < min(actual.length, expected.length); i++) {
    a.isEqual(actual[i], expected[i], `${msg}[${i}]`);
  }
}

/** Helper: convert ASCII string to expected byte array. */
function ascii(s: string): u8[] {
  const out: u8[] = [];
  for (let i = 0; i < s.length; i++) {
    out.push(<u8>s.charCodeAt(i));
  }
  return out;
}

export const TESTS: Test[] = [
  test("str appends ASCII bytes", () => {
    const a = Assert.create();
    const result = ByteBuf.create(16).strAscii("hello").finish();
    assertBytes(a, result, ascii("hello"), "str");
    return a;
  }),

  test("bytes appends raw data", () => {
    const a = Assert.create();
    const data = new Uint8Array(3);
    data[0] = 0xaa;
    data[1] = 0xbb;
    data[2] = 0xcc;
    const result = ByteBuf.create(16).bytes(data).finish();
    assertBytes(a, result, [0xaa, 0xbb, 0xcc], "bytes");
    return a;
  }),

  test("chaining str + bytes + str", () => {
    const a = Assert.create();
    const data = new Uint8Array(2);
    data[0] = 0xff;
    data[1] = 0x01;
    const result = ByteBuf.create(32).strAscii("A=").bytes(data).strAscii("!").finish();
    const expected: u8[] = ascii("A=");
    expected.push(0xff);
    expected.push(0x01);
    expected.push(<u8>"!".charCodeAt(0));
    assertBytes(a, result, expected, "chain");
    return a;
  }),

  test("u64 zero", () => {
    const a = Assert.create();
    const result = ByteBuf.create(8).u64(0).finish();
    assertBytes(a, result, ascii("0"), "u64(0)");
    return a;
  }),

  test("u64 small value", () => {
    const a = Assert.create();
    const result = ByteBuf.create(8).u64(42).finish();
    assertBytes(a, result, ascii("42"), "u64(42)");
    return a;
  }),

  test("u64 large value", () => {
    const a = Assert.create();
    const result = ByteBuf.create(32).u64(u64.MAX_VALUE).finish();
    assertBytes(a, result, ascii("18446744073709551615"), "u64 max");
    return a;
  }),

  test("u32 delegates to u64", () => {
    const a = Assert.create();
    const result = ByteBuf.create(16).u32(4294967295).finish();
    assertBytes(a, result, ascii("4294967295"), "u32 max");
    return a;
  }),

  test("i32 positive", () => {
    const a = Assert.create();
    const result = ByteBuf.create(8).i32(123).finish();
    assertBytes(a, result, ascii("123"), "i32(123)");
    return a;
  }),

  test("i32 negative", () => {
    const a = Assert.create();
    const result = ByteBuf.create(8).i32(-7).finish();
    assertBytes(a, result, ascii("-7"), "i32(-7)");
    return a;
  }),

  test("i32 MIN_VALUE", () => {
    const a = Assert.create();
    const result = ByteBuf.create(16).i32(i32.MIN_VALUE).finish();
    assertBytes(a, result, ascii("-2147483648"), "i32 min");
    return a;
  }),

  test("i32 zero", () => {
    const a = Assert.create();
    const result = ByteBuf.create(8).i32(0).finish();
    assertBytes(a, result, ascii("0"), "i32(0)");
    return a;
  }),

  test("hex with data", () => {
    const a = Assert.create();
    const data = new Uint8Array(3);
    data[0] = 0xde;
    data[1] = 0xad;
    data[2] = 0x09;
    const result = ByteBuf.create(16).hex(data).finish();
    assertBytes(a, result, ascii("0xdead09"), "hex");
    return a;
  }),

  test("hex with empty data", () => {
    const a = Assert.create();
    const result = ByteBuf.create(8).hex(new Uint8Array(0)).finish();
    assertBytes(a, result, ascii("0x"), "hex empty");
    return a;
  }),

  test("hex all nibble values", () => {
    const a = Assert.create();
    const data = new Uint8Array(1);
    data[0] = 0xaf;
    const result = ByteBuf.create(8).hex(data).finish();
    assertBytes(a, result, ascii("0xaf"), "hex 0xaf");
    return a;
  }),

  test("str truncated at capacity", () => {
    const a = Assert.create();
    const result = ByteBuf.create(3).strAscii("hello").finish();
    assertBytes(a, result, ascii("hel"), "truncated str");
    return a;
  }),

  test("bytes truncated at capacity", () => {
    const a = Assert.create();
    const data = new Uint8Array(5);
    for (let i = 0; i < 5; i++) data[i] = <u8>(i + 1);
    const result = ByteBuf.create(3).bytes(data).finish();
    assertBytes(a, result, [1, 2, 3], "truncated bytes");
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
    assertBytes(a, result, ascii("0xabcd"), "hex cap=6");

    // With cap=5: "0x" + "ab" = 4 bytes, pos=4, need pos+1 < 5 → 5 < 5 → false, drops cd
    const result2 = ByteBuf.create(5).hex(data).finish();
    assertBytes(a, result2, ascii("0xab"), "hex cap=5");
    return a;
  }),

  test("u64 truncated at capacity", () => {
    const a = Assert.create();
    // "12345" needs 5 chars, capacity=3 → truncated to 3 positions.
    // u64 writes right-to-left filling from the end, so the high digits
    // that don't fit are dropped and we get the trailing digits.
    const result = ByteBuf.create(3).u64(12345).finish();
    assertBytes(a, result, ascii("345"), "truncated u64");
    return a;
  }),

  test("finish resets for reuse", () => {
    const a = Assert.create();
    const buf = ByteBuf.create(16);
    const first = buf.strAscii("one").finish();
    const second = buf.strAscii("two").finish();
    assertBytes(a, first, ascii("one"), "first");
    assertBytes(a, second, ascii("two"), "second");
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
    assertBytes(a, result, ascii("kept"), "after reset");
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
];
