import { Bytes32, BytesBlob } from "../core/bytes";
import { Decoder } from "../core/codec/decode";
import { Encoder } from "../core/codec/encode";
import { Assert, Test, test } from "../test/utils";
import { AccumulateArgs, RefineArgs, Response } from "./service";

/** Helper: create a Bytes32 filled with a repeating byte. */
function bytes32Fill(v: u8): Bytes32 {
  const raw = new Uint8Array(32);
  raw.fill(v);
  return Bytes32.wrapUnchecked(raw);
}

export const TESTS: Test[] = [
  // ─── RefineArgs ───

  test("RefineArgs roundtrip", () => {
    const payload = BytesBlob.parseBlob("0xdeadbeef").okay!;
    const hash = bytes32Fill(0xab);
    const original = new RefineArgs(5, 10, 42, payload, hash);

    const e = Encoder.create();
    original.encode(e);
    const d = Decoder.fromBlob(e.finish());

    const assert = new Assert();
    const coreIndex = u16(d.varU64());
    const itemIndex = u32(d.varU64());
    const serviceId = u32(d.varU64());
    const decodedPayload = d.bytesVarLen();
    const workPackageHash = d.bytes32();

    assert.isEqual(coreIndex, 5, "coreIndex");
    assert.isEqual(itemIndex, 10, "itemIndex");
    assert.isEqual(serviceId, 42, "serviceId");
    assert.isEqualBytes(decodedPayload, payload, "payload");
    assert.isEqualBytes(BytesBlob.wrap(workPackageHash.raw), BytesBlob.wrap(hash.raw), "workPackageHash");
    assert.isEqual(d.isFinished(), true, "finished");
    assert.isEqual(d.isError, false, "no error");
    return assert;
  }),

  test("RefineArgs roundtrip with empty payload", () => {
    const original = new RefineArgs(0, 0, 0, BytesBlob.empty(), bytes32Fill(0x00));

    const e = Encoder.create();
    original.encode(e);
    const d = Decoder.fromBlob(e.finish());

    const assert = new Assert();
    assert.isEqual(u16(d.varU64()), 0, "coreIndex");
    assert.isEqual(u32(d.varU64()), 0, "itemIndex");
    assert.isEqual(u32(d.varU64()), 0, "serviceId");
    assert.isEqualBytes(d.bytesVarLen(), BytesBlob.empty(), "empty payload");
    assert.isEqualBytes(BytesBlob.wrap(d.bytes32().raw), BytesBlob.wrap(bytes32Fill(0x00).raw), "zero hash");
    assert.isEqual(d.isFinished(), true, "finished");
    return assert;
  }),

  test("RefineArgs roundtrip with max values", () => {
    const payload = BytesBlob.parseBlob("0xff").okay!;
    const original = new RefineArgs(0xffff, 0xffffffff, 0xffffffff, payload, bytes32Fill(0xff));

    const e = Encoder.create();
    original.encode(e);
    const d = Decoder.fromBlob(e.finish());

    const assert = new Assert();
    assert.isEqual(u16(d.varU64()), 0xffff, "coreIndex max");
    assert.isEqual(d.varU64(), 0xffffffff, "itemIndex max");
    assert.isEqual(d.varU64(), 0xffffffff, "serviceId max");
    assert.isEqualBytes(d.bytesVarLen(), payload, "payload");
    assert.isEqualBytes(BytesBlob.wrap(d.bytes32().raw), BytesBlob.wrap(bytes32Fill(0xff).raw), "hash all ff");
    assert.isEqual(d.isFinished(), true, "finished");
    return assert;
  }),

  // ─── AccumulateArgs ───

  test("AccumulateArgs roundtrip", () => {
    const original = new AccumulateArgs(12345, 678, 3);

    const e = Encoder.create();
    original.encode(e);
    const d = Decoder.fromBlob(e.finish());

    const assert = new Assert();
    assert.isEqual(u32(d.varU64()), 12345, "slot");
    assert.isEqual(u32(d.varU64()), 678, "serviceId");
    assert.isEqual(u32(d.varU64()), 3, "argsLength");
    assert.isEqual(d.isFinished(), true, "finished");
    assert.isEqual(d.isError, false, "no error");
    return assert;
  }),

  test("AccumulateArgs roundtrip zero values", () => {
    const original = new AccumulateArgs(0, 0, 0);

    const e = Encoder.create();
    original.encode(e);
    const d = Decoder.fromBlob(e.finish());

    const assert = new Assert();
    assert.isEqual(u32(d.varU64()), 0, "slot");
    assert.isEqual(u32(d.varU64()), 0, "serviceId");
    assert.isEqual(u32(d.varU64()), 0, "argsLength");
    assert.isEqual(d.isFinished(), true, "finished");
    return assert;
  }),

  test("AccumulateArgs roundtrip max values", () => {
    const original = new AccumulateArgs(0xffffffff, 0xffffffff, 0xffffffff);

    const e = Encoder.create();
    original.encode(e);
    const d = Decoder.fromBlob(e.finish());

    const assert = new Assert();
    assert.isEqual(d.varU64(), 0xffffffff, "slot max");
    assert.isEqual(d.varU64(), 0xffffffff, "serviceId max");
    assert.isEqual(d.varU64(), 0xffffffff, "argsLength max");
    assert.isEqual(d.isFinished(), true, "finished");
    return assert;
  }),

  // ─── Response ───

  test("Response roundtrip with data", () => {
    const data = BytesBlob.parseBlob("0xaabbccdd").okay!;
    const original = new Response(42, data);

    const e = Encoder.create();
    original.encode(e);
    const decoded = Response.decode(e.finish());

    const assert = new Assert();
    assert.isEqual(decoded.result, 42, "result");
    assert.isEqualBytes(decoded.data, data, "data");
    return assert;
  }),

  test("Response roundtrip via decode(encode())", () => {
    const data = BytesBlob.parseBlob("0x1234567890").okay!;
    const original = new Response(-1, data);

    const e = Encoder.create();
    original.encode(e);
    const decoded = Response.decode(e.finish());

    const assert = new Assert();
    assert.isEqual(decoded.result, -1, "result negative");
    assert.isEqualBytes(decoded.data, data, "data");
    return assert;
  }),

  test("Response roundtrip with empty data", () => {
    const original = new Response(0, BytesBlob.empty());

    const e = Encoder.create();
    original.encode(e);
    const decoded = Response.decode(e.finish());

    const assert = new Assert();
    assert.isEqual(decoded.result, 0, "result zero");
    assert.isEqualBytes(decoded.data, BytesBlob.empty(), "empty data");
    return assert;
  }),

  test("Response roundtrip with negative result", () => {
    const original = new Response(-4, BytesBlob.parseBlob("0xff").okay!);

    const e = Encoder.create();
    original.encode(e);
    const decoded = Response.decode(e.finish());

    const assert = new Assert();
    assert.isEqual(decoded.result, -4, "result WHO sentinel");
    assert.isEqualBytes(decoded.data, BytesBlob.parseBlob("0xff").okay!, "data");
    return assert;
  }),
];
