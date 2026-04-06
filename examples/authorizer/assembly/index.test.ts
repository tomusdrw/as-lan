import { BytesBlob, Encoder } from "@fluffylabs/as-lan";
import { Assert, Test, TestEcalli, TestFetch, test, unpackResult } from "@fluffylabs/as-lan/test";
import { authorize } from "./authorize";

/** Encode a u16 LE core index into a BytesBlob. */
function encodeCoreIndex(coreIndex: u16): BytesBlob {
  const buf = BytesBlob.zero(2);
  const enc = Encoder.into(buf.raw);
  enc.u16(coreIndex);
  return buf;
}

/** Call authorize with the given core index, returning the raw output bytes. */
function callAuthorize(coreIndex: u16): Uint8Array {
  const args = encodeCoreIndex(coreIndex);
  const result = authorize(args.ptr(), args.length);
  return unpackResult(result);
}

/** Convert a string to ASCII bytes. */
function strToBytes(s: string): Uint8Array {
  return BytesBlob.encodeAscii(s).raw;
}

export const TESTS: Test[] = [
  test("authorize succeeds when token matches config", () => {
    TestEcalli.reset();
    const token = strToBytes("hello");
    TestFetch.setDataForKind(8, token);
    TestFetch.setDataForKind(9, token);

    const result = callAuthorize(3);
    const a = Assert.create();
    const expected = strToBytes("Auth=<hello>");
    a.isEqual(result.length, expected.length, "result length");
    for (let i = 0; i < expected.length; i++) {
      a.isEqual(result[i], expected[i], `byte[${i}]`);
    }
    return a;
  }),

  test("authorize succeeds with binary token", () => {
    TestEcalli.reset();
    const token = BytesBlob.parseBlob("0xdeadbeef").okay!;
    TestFetch.setDataForKind(8, token.raw);
    TestFetch.setDataForKind(9, token.raw);

    const result = callAuthorize(7);
    const a = Assert.create();
    // "Auth=<" + 4 raw bytes + ">"
    a.isEqual(result.length, 11, "result length");
    // prefix "Auth=<"
    const prefix = strToBytes("Auth=<");
    for (let i = 0; i < prefix.length; i++) {
      a.isEqual(result[i], prefix[i], `prefix[${i}]`);
    }
    // raw token bytes
    a.isEqual(result[6], 0xde, "token[0]");
    a.isEqual(result[7], 0xad, "token[1]");
    a.isEqual(result[8], 0xbe, "token[2]");
    a.isEqual(result[9], 0xef, "token[3]");
    // suffix ">"
    a.isEqual(result[10], 0x3e, "suffix >");
    return a;
  }),

  test("authorize succeeds with empty token", () => {
    TestEcalli.reset();
    const token = BytesBlob.empty();
    TestFetch.setDataForKind(8, token.raw);
    TestFetch.setDataForKind(9, token.raw);

    const result = callAuthorize(0);
    const a = Assert.create();
    const expected = strToBytes("Auth=<>");
    a.isEqual(result.length, expected.length, "result length");
    for (let i = 0; i < expected.length; i++) {
      a.isEqual(result[i], expected[i], `byte[${i}]`);
    }
    return a;
  }),
];
