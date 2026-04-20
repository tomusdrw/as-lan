import { Bytes32, BytesBlob, Decoder, Encoder, RefineArgs, RefineContext, Response } from "@fluffylabs/as-lan";
import { Assert, Test, test, unpackResult } from "@fluffylabs/as-lan/test";
import { blake2b256 } from "./crypto/blake2b";
import { refine } from "./refine";

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

function assertBytes(assert: Assert, actual: Uint8Array, expected: Uint8Array, msg: string): void {
  assert.isEqual(actual.length, expected.length, `${msg}.length`);
  if (actual.length !== expected.length) return;
  for (let i = 0; i < actual.length; i += 1) {
    assert.isEqual(actual[i], expected[i], `${msg}[${i}]`);
  }
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
    if (resp.data.length === 36) {
      const hash = blake2b256(payload);
      const actualHash = new Uint8Array(32);
      for (let i = 0; i < 32; i += 1) actualHash[i] = resp.data.raw[i];
      assertBytes(assert, actualHash, hash, "hash");
      const b0 = u32(resp.data.raw[32]);
      const b1 = u32(resp.data.raw[33]);
      const b2 = u32(resp.data.raw[34]);
      const b3 = u32(resp.data.raw[35]);
      const length = b0 | (b1 << 8) | (b2 << 16) | (b3 << 24);
      assert.isEqual(length, <u32>4, "length_LE");
    }
    return assert;
  }),
  test("refine handles empty payload", () => {
    const resp = callRefine(new Uint8Array(0));
    const assert = Assert.create();
    assert.isEqual(resp.result, 0, "result");
    assert.isEqual(resp.data.length, 36, "data.length");
    if (resp.data.length === 36) {
      const hash = blake2b256(new Uint8Array(0));
      const actualHash = new Uint8Array(32);
      for (let i = 0; i < 32; i += 1) actualHash[i] = resp.data.raw[i];
      assertBytes(assert, actualHash, hash, "hash");
      const b0 = u32(resp.data.raw[32]);
      const b1 = u32(resp.data.raw[33]);
      const b2 = u32(resp.data.raw[34]);
      const b3 = u32(resp.data.raw[35]);
      const length = b0 | (b1 << 8) | (b2 << 16) | (b3 << 24);
      assert.isEqual(length, <u32>0, "length_LE");
    }
    return assert;
  }),
];
