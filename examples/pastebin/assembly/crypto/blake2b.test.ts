import { BytesBlob } from "@fluffylabs/as-lan";
import { Assert, Test, test } from "@fluffylabs/as-lan/test";
import { blake2b256 } from "./blake2b";

function fromHex(hex: string): Uint8Array {
  return BytesBlob.parseBlob(hex).okay!.raw;
}

function assertBytes(assert: Assert, actual: Uint8Array, expected: Uint8Array, msg: string): void {
  assert.isEqual(actual.length, expected.length, `${msg}.length`);
  if (actual.length !== expected.length) return;
  for (let i = 0; i < actual.length; i += 1) {
    assert.isEqual(actual[i], expected[i], `${msg}[${i}]`);
  }
}

export const TESTS: Test[] = [
  // Verified via: python3 -c "import hashlib; print(hashlib.blake2b(b'...', digest_size=32).hexdigest())"
  test("blake2b256 empty input", () => {
    const got = blake2b256(new Uint8Array(0));
    const exp = fromHex("0x0e5751c026e543b2e8ab2eb06099daa1d1e5df47778f7787faab45cdf12fe3a8");
    const assert = Assert.create();
    assertBytes(assert, got, exp, "hash");
    return assert;
  }),
  test("blake2b256 'abc'", () => {
    const input = new Uint8Array(3);
    input[0] = 0x61; input[1] = 0x62; input[2] = 0x63;
    const got = blake2b256(input);
    const exp = fromHex("0xbddd813c634239723171ef3fee98579b94964e3bb1cb3e427262c8c068d52319");
    const assert = Assert.create();
    assertBytes(assert, got, exp, "hash");
    return assert;
  }),
  test("blake2b256 144 bytes of 0xaa — exceeds single block", () => {
    const input = new Uint8Array(144);
    for (let i = 0; i < 144; i += 1) input[i] = 0xaa;
    const got = blake2b256(input);
    const exp = fromHex("0x59ccfbdaa43eae776228a5ac904618eab144ed32596bc60ce66a27d44110ef9b");
    const assert = Assert.create();
    assertBytes(assert, got, exp, "hash");
    return assert;
  }),
];
