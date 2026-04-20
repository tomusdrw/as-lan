import { Bytes32, BytesBlob, Decoder, Encoder, RefineArgs, RefineContext, Response } from "@fluffylabs/as-lan";
import { Assert, Test, test, unpackResult } from "@fluffylabs/as-lan/test";
import { blake2b256 } from "./crypto/blake2b";
import { refine } from "./refine";
import { assertBytes } from "./test-helpers";

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

class DecodedOperand {
  static create(hash: Uint8Array, length: u32): DecodedOperand {
    return new DecodedOperand(hash, length);
  }
  private constructor(public readonly hash: Uint8Array, public readonly length: u32) {}
}

function decodeOperand(data: BytesBlob): DecodedOperand {
  const hash = new Uint8Array(32);
  for (let i = 0; i < 32; i += 1) hash[i] = data.raw[i];
  const length: u32 = u32(data.raw[32])
    | (u32(data.raw[33]) << 8)
    | (u32(data.raw[34]) << 16)
    | (u32(data.raw[35]) << 24);
  return DecodedOperand.create(hash, length);
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
    if (resp.data.length !== 36) return assert;
    const op = decodeOperand(resp.data);
    assertBytes(assert, op.hash, blake2b256(payload), "hash");
    assert.isEqual(op.length, <u32>4, "length_LE");
    return assert;
  }),
  test("refine handles empty payload", () => {
    const resp = callRefine(new Uint8Array(0));
    const assert = Assert.create();
    assert.isEqual(resp.result, 0, "result");
    assert.isEqual(resp.data.length, 36, "data.length");
    if (resp.data.length !== 36) return assert;
    const op = decodeOperand(resp.data);
    assertBytes(assert, op.hash, blake2b256(new Uint8Array(0)), "hash");
    assert.isEqual(op.length, <u32>0, "length_LE");
    return assert;
  }),
];
