import { Bytes32, BytesBlob } from "../core/bytes";
import { Decoder } from "../core/codec/decode";
import { Encoder } from "../core/codec/encode";
import { Assert, Test, test, unpackResult } from "../test/utils";
import { AccumulateContext } from "./accumulate/context";
import { RefineContext } from "./refine/context";
import { AccumulateArgs, RefineArgs, Response } from "./service";

/** Helper: create a Bytes32 filled with a repeating byte. */
function bytes32Fill(v: u8): Bytes32 {
  const raw = new Uint8Array(32);
  raw.fill(v);
  return Bytes32.wrapUnchecked(raw);
}

// Test-only: contexts created at module scope for convenience.
const rCtx: RefineContext = RefineContext.create();
const aCtx: AccumulateContext = AccumulateContext.create();

export const TESTS: Test[] = [
  // ─── RefineArgs ───

  test("RefineArgs roundtrip", () => {
    const payload = BytesBlob.parseBlob("0xdeadbeef").okay!;
    const hash = bytes32Fill(0xab);
    const original = RefineArgs.create(5, 10, 42, payload, hash);

    const e = Encoder.create();
    rCtx.refineArgs.encode(original, e);
    const blob = e.finish();
    const result = rCtx.parseArgs(u32(blob.dataStart), blob.length);

    const assert = Assert.create();
    assert.isEqual(result.isOkay, true, "parse ok");
    const parsed = result.okay!;
    assert.isEqual(parsed.coreIndex, 5, "coreIndex");
    assert.isEqual(parsed.itemIndex, 10, "itemIndex");
    assert.isEqual(parsed.serviceId, 42, "serviceId");
    assert.isEqualBytes(parsed.payload, payload, "payload");
    assert.isEqualBytes(BytesBlob.wrap(parsed.workPackageHash.raw), BytesBlob.wrap(hash.raw), "workPackageHash");
    return assert;
  }),

  test("RefineArgs roundtrip with empty payload", () => {
    const hash = bytes32Fill(0x00);
    const original = RefineArgs.create(0, 0, 0, BytesBlob.empty(), hash);

    const e = Encoder.create();
    rCtx.refineArgs.encode(original, e);
    const blob = e.finish();
    const result = rCtx.parseArgs(u32(blob.dataStart), blob.length);

    const assert = Assert.create();
    assert.isEqual(result.isOkay, true, "parse ok");
    const parsed = result.okay!;
    assert.isEqual(parsed.coreIndex, 0, "coreIndex");
    assert.isEqual(parsed.itemIndex, 0, "itemIndex");
    assert.isEqual(parsed.serviceId, 0, "serviceId");
    assert.isEqualBytes(parsed.payload, BytesBlob.empty(), "empty payload");
    assert.isEqualBytes(BytesBlob.wrap(parsed.workPackageHash.raw), BytesBlob.wrap(hash.raw), "zero hash");
    return assert;
  }),

  test("RefineArgs roundtrip with max values", () => {
    const payload = BytesBlob.parseBlob("0xff").okay!;
    const hash = bytes32Fill(0xff);
    const original = RefineArgs.create(0xffff, 0xffffffff, 0xffffffff, payload, hash);

    const e = Encoder.create();
    rCtx.refineArgs.encode(original, e);
    const blob = e.finish();
    const result = rCtx.parseArgs(u32(blob.dataStart), blob.length);

    const assert = Assert.create();
    assert.isEqual(result.isOkay, true, "parse ok");
    const parsed = result.okay!;
    assert.isEqual(parsed.coreIndex, 0xffff, "coreIndex max");
    assert.isEqual(parsed.itemIndex, 0xffffffff, "itemIndex max");
    assert.isEqual(parsed.serviceId, 0xffffffff, "serviceId max");
    assert.isEqualBytes(parsed.payload, payload, "payload");
    assert.isEqualBytes(BytesBlob.wrap(parsed.workPackageHash.raw), BytesBlob.wrap(hash.raw), "hash all ff");
    return assert;
  }),

  // ─── AccumulateArgs ───

  test("AccumulateArgs roundtrip", () => {
    const original = AccumulateArgs.create(12345, 678, 3);

    const e = Encoder.create();
    aCtx.accumulateArgs.encode(original, e);
    const blob = e.finish();
    const result = aCtx.parseArgs(u32(blob.dataStart), blob.length);

    const assert = Assert.create();
    assert.isEqual(result.isOkay, true, "parse ok");
    const parsed = result.okay!;
    assert.isEqual(parsed.slot, 12345, "slot");
    assert.isEqual(parsed.serviceId, 678, "serviceId");
    assert.isEqual(parsed.argsLength, 3, "argsLength");
    return assert;
  }),

  test("AccumulateArgs roundtrip zero values", () => {
    const original = AccumulateArgs.create(0, 0, 0);

    const e = Encoder.create();
    aCtx.accumulateArgs.encode(original, e);
    const blob = e.finish();
    const result = aCtx.parseArgs(u32(blob.dataStart), blob.length);

    const assert = Assert.create();
    assert.isEqual(result.isOkay, true, "parse ok");
    const parsed = result.okay!;
    assert.isEqual(parsed.slot, 0, "slot");
    assert.isEqual(parsed.serviceId, 0, "serviceId");
    assert.isEqual(parsed.argsLength, 0, "argsLength");
    return assert;
  }),

  test("AccumulateArgs roundtrip max values", () => {
    const original = AccumulateArgs.create(0xffffffff, 0xffffffff, 0xffffffff);

    const e = Encoder.create();
    aCtx.accumulateArgs.encode(original, e);
    const blob = e.finish();
    const result = aCtx.parseArgs(u32(blob.dataStart), blob.length);

    const assert = Assert.create();
    assert.isEqual(result.isOkay, true, "parse ok");
    const parsed = result.okay!;
    assert.isEqual(parsed.slot, 0xffffffff, "slot max");
    assert.isEqual(parsed.serviceId, 0xffffffff, "serviceId max");
    assert.isEqual(parsed.argsLength, 0xffffffff, "argsLength max");
    return assert;
  }),

  // ─── Response ───

  test("Response roundtrip with data", () => {
    const data = BytesBlob.parseBlob("0xaabbccdd").okay!;
    const original = Response.create(42, data);

    const e = Encoder.create();
    aCtx.response.encode(original, e);
    const decoded = aCtx.response.decode(Decoder.fromBlob(e.finish())).okay!;

    const assert = Assert.create();
    assert.isEqual(decoded.result, 42, "result");
    assert.isEqualBytes(decoded.data, data, "data");
    return assert;
  }),

  test("Response roundtrip via decode(encode())", () => {
    const data = BytesBlob.parseBlob("0x1234567890").okay!;
    const original = Response.create(-1, data);

    const e = Encoder.create();
    aCtx.response.encode(original, e);
    const decoded = aCtx.response.decode(Decoder.fromBlob(e.finish())).okay!;

    const assert = Assert.create();
    assert.isEqual(decoded.result, -1, "result negative");
    assert.isEqualBytes(decoded.data, data, "data");
    return assert;
  }),

  test("Response roundtrip with empty data", () => {
    const original = Response.create(0, BytesBlob.empty());

    const e = Encoder.create();
    aCtx.response.encode(original, e);
    const decoded = aCtx.response.decode(Decoder.fromBlob(e.finish())).okay!;

    const assert = Assert.create();
    assert.isEqual(decoded.result, 0, "result zero");
    assert.isEqualBytes(decoded.data, BytesBlob.empty(), "empty data");
    return assert;
  }),

  test("Response roundtrip with negative result", () => {
    const original = Response.create(-4, BytesBlob.parseBlob("0xff").okay!);

    const e = Encoder.create();
    aCtx.response.encode(original, e);
    const decoded = aCtx.response.decode(Decoder.fromBlob(e.finish())).okay!;

    const assert = Assert.create();
    assert.isEqual(decoded.result, -4, "result WHO sentinel");
    assert.isEqualBytes(decoded.data, BytesBlob.parseBlob("0xff").okay!, "data");
    return assert;
  }),

  test("Response.with null data roundtrip", () => {
    const packed = Response.with(7, null);
    const raw = unpackResult(packed);
    const decoded = aCtx.response.decode(Decoder.fromBlob(raw)).okay!;

    const assert = Assert.create();
    assert.isEqual(decoded.result, 7, "result");
    assert.isEqualBytes(decoded.data, BytesBlob.empty(), "null data decodes as empty");
    return assert;
  }),
];
