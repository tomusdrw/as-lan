import { BytesBlob, Decoder, Encoder, readFromMemory } from "@fluffylabs/as-lan";
import { Assert, Test, test } from "@fluffylabs/as-lan/test";
import { EcalliIndex } from "./ecalli-index";
import { refine } from "./service";

/** Wrap a string as a BytesBlob (String.UTF8.encode returns ArrayBuffer). */
function strBlob(s: string): BytesBlob {
  const buf = String.UTF8.encode(s);
  return BytesBlob.wrap(Uint8Array.wrap(buf));
}

function unpackResult(result: u64): Uint8Array {
  const len = u32(result >> 32);
  const ptr = u32(result & 0xffffffff);
  return readFromMemory(ptr, len);
}

/** Build full refine args encoding with the given inner payload. */
function buildRefineArgs(payload: Uint8Array): Uint8Array {
  const enc = Encoder.create();
  enc.varU64(0); // coreIndex
  enc.varU64(0); // itemIndex
  enc.varU64(42); // serviceId
  enc.bytesVarLen(BytesBlob.wrap(payload));
  enc.bytesFixLen(new Uint8Array(32)); // workPackageHash (zeros)
  return enc.finish();
}

/** Call refine with the given ecalli dispatch payload. */
function callRefine(payload: Uint8Array): Response {
  const args = buildRefineArgs(payload);
  const buf = new Uint8Array(args.length);
  buf.set(args);
  const raw = unpackResult(refine(u32(buf.dataStart), buf.byteLength));
  return Response.decode(raw);
}

/** Decoded ecalli response: result code + output data. */
class Response {
  constructor(
    public result: i64,
    public data: BytesBlob,
  ) {}

  static decode(raw: Uint8Array): Response {
    const d = Decoder.fromBlob(raw);
    const result = i64(d.u64());
    const data = d.bytesVarLen();
    return new Response(result, data);
  }
}

export const TESTS: Test[] = [
  test("gas: returns remaining gas", () => {
    const p = Encoder.create();
    p.varU64(EcalliIndex.Gas);

    const resp = callRefine(p.finish());
    const assert = new Assert();
    assert.isEqual(resp.result, 1000000, "gas result");
    assert.isEqual(resp.data.raw.length, 0, "no output data");
    return assert;
  }),

  test("fetch: fetches work package data", () => {
    const p = Encoder.create();
    p.varU64(EcalliIndex.Fetch);
    p.varU64(7); // kind: WorkPackage
    p.varU64(0); // param1
    p.varU64(0); // param2
    p.varU64(0); // offset
    p.varU64(32); // maxLen

    const resp = callRefine(p.finish());
    const assert = new Assert();
    assert.isEqual(resp.result, 16, "fetch total length");
    assert.isEqual(resp.data.raw.length, 16, "fetched data length");
    // Verify pattern: stub fills with (kind*16 + i) & 0xFF
    assert.isEqual(resp.data.raw[0], (7 * 16) & 0xff, "data[0]");
    assert.isEqual(resp.data.raw[1], (7 * 16 + 1) & 0xff, "data[1]");
    return assert;
  }),

  test("lookup: looks up preimage by hash", () => {
    const p = Encoder.create();
    p.varU64(EcalliIndex.Lookup);
    p.varU64(u64(u32.MAX_VALUE)); // service: current
    p.bytesFixLen(new Uint8Array(32)); // hash: zeros
    p.varU64(0); // offset
    p.varU64(256); // maxLen

    const resp = callRefine(p.finish());
    const assert = new Assert();
    // stub returns "test-preimage" (13 bytes)
    assert.isEqual(resp.result, 13, "lookup total length");
    assert.isEqual(resp.data.raw.length, 13, "preimage data length");
    return assert;
  }),

  test("read: returns NONE for missing key", () => {
    const p = Encoder.create();
    p.varU64(EcalliIndex.Read);
    p.varU64(u64(u32.MAX_VALUE)); // service: current
    p.bytesVarLen(strBlob("missing")); // key
    p.varU64(0); // offset
    p.varU64(8); // maxLen

    const resp = callRefine(p.finish());
    const assert = new Assert();
    assert.isEqual(resp.result, -1, "read returns NONE");
    assert.isEqual(resp.data.raw.length, 0, "no data for missing key");
    return assert;
  }),

  test("write: stores a value, returns NONE for first write", () => {
    const p = Encoder.create();
    p.varU64(EcalliIndex.Write);
    p.bytesVarLen(strBlob("mykey")); // key
    const val = new Uint8Array(4);
    val[0] = 0xca;
    val[1] = 0xfe;
    val[2] = 0xba;
    val[3] = 0xbe;
    p.bytesVarLen(BytesBlob.wrap(val)); // value

    const resp = callRefine(p.finish());
    const assert = new Assert();
    assert.isEqual(resp.result, -1, "write returns NONE (no previous value)");
    return assert;
  }),

  test("read: reads back previously written value", () => {
    const p = Encoder.create();
    p.varU64(EcalliIndex.Read);
    p.varU64(u64(u32.MAX_VALUE)); // service
    p.bytesVarLen(strBlob("mykey")); // key
    p.varU64(0); // offset
    p.varU64(8); // maxLen

    const resp = callRefine(p.finish());
    const assert = new Assert();
    assert.isEqual(resp.result, 4, "read returns value length");
    assert.isEqual(resp.data.raw.length, 4, "data length");
    assert.isEqual(resp.data.raw[0], 0xca, "data[0]");
    assert.isEqual(resp.data.raw[1], 0xfe, "data[1]");
    assert.isEqual(resp.data.raw[2], 0xba, "data[2]");
    assert.isEqual(resp.data.raw[3], 0xbe, "data[3]");
    return assert;
  }),

  test("write: second write returns previous value length", () => {
    const p = Encoder.create();
    p.varU64(EcalliIndex.Write);
    p.bytesVarLen(strBlob("mykey")); // key
    p.bytesVarLen(strBlob("newval")); // value

    const resp = callRefine(p.finish());
    const assert = new Assert();
    assert.isEqual(resp.result, 4, "write returns previous value length");
    return assert;
  }),

  test("info: returns 96-byte service info", () => {
    const p = Encoder.create();
    p.varU64(EcalliIndex.Info);
    p.varU64(u64(u32.MAX_VALUE)); // service: current
    p.varU64(0); // offset
    p.varU64(96); // maxLen

    const resp = callRefine(p.finish());
    const assert = new Assert();
    assert.isEqual(resp.result, 96, "info total length");
    assert.isEqual(resp.data.raw.length, 96, "info data length");
    // Stub fills code_hash with 0xAA
    assert.isEqual(resp.data.raw[0], 0xaa, "code_hash[0]");
    assert.isEqual(resp.data.raw[31], 0xaa, "code_hash[31]");
    // Stub sets balance to 1000 LE
    assert.isEqual(resp.data.raw[32], 0xe8, "balance[0]");
    assert.isEqual(resp.data.raw[33], 0x03, "balance[1]");
    return assert;
  }),

  test("log: emits a debug message", () => {
    const p = Encoder.create();
    p.varU64(EcalliIndex.Log);
    p.varU64(2); // level: Important
    p.bytesVarLen(strBlob("test-target"));
    p.bytesVarLen(strBlob("hello from test"));

    const resp = callRefine(p.finish());
    const assert = new Assert();
    assert.isEqual(resp.result, 0, "log returns 0");
    return assert;
  }),
];
