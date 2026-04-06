import { BytesBlob, Encoder } from "@fluffylabs/as-lan";
import { Assert, Test, TestStorage, test } from "@fluffylabs/as-lan/test";
import { EcalliIndex } from "./ecalli-index";
import { callRefine, strBlob } from "./test-helpers";

export const TESTS: Test[] = [
  // === General ecallis (0-5, 100) ===

  test("gas: returns remaining gas", () => {
    const p = Encoder.create();
    p.varU64(EcalliIndex.Gas);

    const resp = callRefine(p.finishRaw());
    const assert = Assert.create();
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

    const resp = callRefine(p.finishRaw());
    const assert = Assert.create();
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
    p.bytesFixLen(BytesBlob.zero(32)); // hash: zeros
    p.varU64(0); // offset
    p.varU64(256); // maxLen

    const resp = callRefine(p.finishRaw());
    const assert = Assert.create();
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

    const resp = callRefine(p.finishRaw());
    const assert = Assert.create();
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

    const resp = callRefine(p.finishRaw());
    const assert = Assert.create();
    assert.isEqual(resp.result, -1, "write returns NONE (no previous value)");
    return assert;
  }),

  test("read: reads back previously written value", () => {
    const val = new Uint8Array(4);
    val[0] = 0xca;
    val[1] = 0xfe;
    val[2] = 0xba;
    val[3] = 0xbe;
    TestStorage.set(strBlob("mykey"), BytesBlob.wrap(val));

    const p = Encoder.create();
    p.varU64(EcalliIndex.Read);
    p.varU64(u64(u32.MAX_VALUE)); // service
    p.bytesVarLen(strBlob("mykey")); // key
    p.varU64(0); // offset
    p.varU64(8); // maxLen

    const resp = callRefine(p.finishRaw());
    const assert = Assert.create();
    assert.isEqual(resp.result, 4, "read returns value length");
    assert.isEqual(resp.data.raw.length, 4, "data length");
    assert.isEqual(resp.data.raw[0], 0xca, "data[0]");
    assert.isEqual(resp.data.raw[1], 0xfe, "data[1]");
    assert.isEqual(resp.data.raw[2], 0xba, "data[2]");
    assert.isEqual(resp.data.raw[3], 0xbe, "data[3]");
    return assert;
  }),

  test("write: overwrite returns previous value length", () => {
    const val = new Uint8Array(4);
    val[0] = 0xca;
    val[1] = 0xfe;
    val[2] = 0xba;
    val[3] = 0xbe;
    TestStorage.set(strBlob("mykey"), BytesBlob.wrap(val));

    const p = Encoder.create();
    p.varU64(EcalliIndex.Write);
    p.bytesVarLen(strBlob("mykey")); // key
    p.bytesVarLen(strBlob("newval")); // value

    const resp = callRefine(p.finishRaw());
    const assert = Assert.create();
    assert.isEqual(resp.result, 4, "write returns previous value length");
    return assert;
  }),

  test("info: returns 96-byte service info", () => {
    const p = Encoder.create();
    p.varU64(EcalliIndex.Info);
    p.varU64(u64(u32.MAX_VALUE)); // service: current
    p.varU64(0); // offset
    p.varU64(96); // maxLen

    const resp = callRefine(p.finishRaw());
    const assert = Assert.create();
    assert.isEqual(resp.result, 96, "info total length");
    assert.isEqual(resp.data.raw.length, 96, "info data length");
    assert.isEqual(resp.data.raw[0], 0xaa, "code_hash[0]");
    assert.isEqual(resp.data.raw[31], 0xaa, "code_hash[31]");
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

    const resp = callRefine(p.finishRaw());
    const assert = Assert.create();
    assert.isEqual(resp.result, 0, "log returns 0");
    return assert;
  }),

  // === Refine ecallis (6-13) ===

  test("historical_lookup: returns historical preimage", () => {
    const p = Encoder.create();
    p.varU64(EcalliIndex.HistoricalLookup);
    p.varU64(u64(u32.MAX_VALUE)); // service: current
    p.bytesFixLen(BytesBlob.zero(32)); // hash: zeros
    p.varU64(0); // offset
    p.varU64(256); // maxLen

    const resp = callRefine(p.finishRaw());
    const assert = Assert.create();
    assert.isEqual(resp.result, 15, "historical_lookup total length");
    assert.isEqual(resp.data.raw.length, 15, "preimage data length");
    return assert;
  }),

  test("export: exports a segment", () => {
    const p = Encoder.create();
    p.varU64(EcalliIndex.Export);
    const segment = new Uint8Array(8);
    segment[0] = 0x42;
    p.bytesVarLen(BytesBlob.wrap(segment));

    const resp = callRefine(p.finishRaw());
    const assert = Assert.create();
    assert.isEqual(resp.result, 0, "export returns segment index 0");
    return assert;
  }),

  test("machine: creates inner PVM", () => {
    const p = Encoder.create();
    p.varU64(EcalliIndex.Machine);
    const code = new Uint8Array(4);
    p.bytesVarLen(BytesBlob.wrap(code));
    p.varU64(0); // entrypoint

    const resp = callRefine(p.finishRaw());
    const assert = Assert.create();
    assert.isEqual(resp.result, 0, "machine returns machine ID 0");
    return assert;
  }),

  test("peek: reads from inner machine memory", () => {
    const p = Encoder.create();
    p.varU64(EcalliIndex.Peek);
    p.varU64(0); // machine_id
    p.varU64(0); // source address
    p.varU64(8); // length

    const resp = callRefine(p.finishRaw());
    const assert = Assert.create();
    assert.isEqual(resp.result, 0, "peek returns OK");
    assert.isEqual(resp.data.raw.length, 8, "peek data length");
    return assert;
  }),

  test("poke: writes to inner machine memory", () => {
    const p = Encoder.create();
    p.varU64(EcalliIndex.Poke);
    p.varU64(0); // machine_id
    const data = new Uint8Array(4);
    data[0] = 0xde;
    data[1] = 0xad;
    p.bytesVarLen(BytesBlob.wrap(data));
    p.varU64(0x1000); // dest address in machine

    const resp = callRefine(p.finishRaw());
    const assert = Assert.create();
    assert.isEqual(resp.result, 0, "poke returns OK");
    return assert;
  }),

  test("pages: sets inner machine page access", () => {
    const p = Encoder.create();
    p.varU64(EcalliIndex.Pages);
    p.varU64(0); // machine_id
    p.varU64(0); // start_page
    p.varU64(1); // page_count
    p.varU64(3); // access_type (read+write)

    const resp = callRefine(p.finishRaw());
    const assert = Assert.create();
    assert.isEqual(resp.result, 0, "pages returns OK");
    return assert;
  }),

  test("invoke: runs inner PVM machine", () => {
    const p = Encoder.create();
    p.varU64(EcalliIndex.Invoke);
    p.varU64(0); // machine_id
    const io = new Uint8Array(8); // I/O structure
    p.bytesVarLen(BytesBlob.wrap(io));

    const resp = callRefine(p.finishRaw());
    const assert = Assert.create();
    assert.isEqual(resp.result, 0, "invoke returns HALT");
    assert.isEqual(resp.data.raw.length, 8, "invoke returns r8 output");
    return assert;
  }),

  test("expunge: destroys inner machine", () => {
    const p = Encoder.create();
    p.varU64(EcalliIndex.Expunge);
    p.varU64(0); // machine_id

    const resp = callRefine(p.finishRaw());
    const assert = Assert.create();
    assert.isEqual(resp.result, 0, "expunge returns OK");
    return assert;
  }),
];
