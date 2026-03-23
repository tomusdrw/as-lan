import { BytesBlob, Decoder, Encoder, responseCodec } from "@fluffylabs/as-lan";
import { Assert, Test, TestAccumulate, test } from "@fluffylabs/as-lan/test";
import { EcalliIndex } from "./ecalli-index";
import { buildTransferItem, callAccumulate, callAccumulateWithOperand } from "./test-helpers";

export const TESTS: Test[] = [
  // === Accumulate: transfer processing ===

  test("accumulate: receives transfer", () => {
    const item = buildTransferItem(99, 42, 500, 10000);
    TestAccumulate.setItem(0, item);
    const raw = callAccumulate(1);
    const resp = responseCodec.decode(Decoder.fromBlob(raw)).okay!;
    const assert = Assert.create();
    assert.isEqual(resp.result, 0, "transfer result OK");
    // Transfer data encoded as: source(u32) + dest(u32) + amount(u64) + gas(u64)
    const d = Decoder.fromBlob(resp.data.raw);
    assert.isEqual(d.u32(), 99, "transfer source");
    assert.isEqual(d.u32(), 42, "transfer dest");
    assert.isEqual(d.u64(), 500, "transfer amount");
    assert.isEqual(d.u64(), 10000, "transfer gas");
    return assert;
  }),

  // === Accumulate: operand ecalli dispatch (14-26) ===
  // Each test sets up a mock operand whose okBlob contains the ecalli payload,
  // then calls accumulate which fetches the item and dispatches.

  test("bless: sets privileged config", () => {
    const p = Encoder.create();
    p.varU64(EcalliIndex.Bless);
    p.varU64(1); // manager
    p.bytesVarLen(BytesBlob.wrap(new Uint8Array(0))); // auth_queue
    p.varU64(2); // delegator
    p.varU64(3); // registrar
    p.bytesVarLen(BytesBlob.wrap(new Uint8Array(0))); // auto_accum
    p.varU64(0); // auto_accum_count

    const resp = callAccumulateWithOperand(p.finish());
    const assert = Assert.create();
    assert.isEqual(resp.result, 0, "bless returns OK");
    return assert;
  }),

  test("assign: assigns core", () => {
    const p = Encoder.create();
    p.varU64(EcalliIndex.Assign);
    p.varU64(0); // core
    p.bytesVarLen(BytesBlob.wrap(new Uint8Array(0))); // auth_queue
    p.varU64(1); // assigners

    const resp = callAccumulateWithOperand(p.finish());
    const assert = Assert.create();
    assert.isEqual(resp.result, 0, "assign returns OK");
    return assert;
  }),

  test("designate: sets next epoch validators", () => {
    const p = Encoder.create();
    p.varU64(EcalliIndex.Designate);
    p.bytesVarLen(BytesBlob.wrap(new Uint8Array(0))); // validators

    const resp = callAccumulateWithOperand(p.finish());
    const assert = Assert.create();
    assert.isEqual(resp.result, 0, "designate returns OK");
    return assert;
  }),

  test("checkpoint: commits state", () => {
    const p = Encoder.create();
    p.varU64(EcalliIndex.Checkpoint);

    const resp = callAccumulateWithOperand(p.finish());
    const assert = Assert.create();
    assert.isEqual(resp.result, 1000000, "checkpoint returns gas");
    return assert;
  }),

  test("new_service: creates new service", () => {
    const p = Encoder.create();
    p.varU64(EcalliIndex.NewService);
    p.bytesFixLen(new Uint8Array(32)); // code_hash
    p.varU64(1024); // code_len
    p.varU64(100000); // gas
    p.varU64(50000); // allowance
    p.varU64(0); // gratis_storage
    p.varU64(u64(u32.MAX_VALUE)); // requested_id (auto)

    const resp = callAccumulateWithOperand(p.finish());
    const assert = Assert.create();
    assert.isEqual(resp.result, 256, "new_service returns service ID 256");
    return assert;
  }),

  test("upgrade: upgrades service code", () => {
    const p = Encoder.create();
    p.varU64(EcalliIndex.Upgrade);
    p.bytesFixLen(new Uint8Array(32)); // code_hash
    p.varU64(100000); // gas
    p.varU64(50000); // allowance

    const resp = callAccumulateWithOperand(p.finish());
    const assert = Assert.create();
    assert.isEqual(resp.result, 0, "upgrade returns OK");
    return assert;
  }),

  test("transfer ecalli: transfers balance", () => {
    const p = Encoder.create();
    p.varU64(EcalliIndex.Transfer);
    p.varU64(100); // dest service
    p.varU64(500); // amount
    p.varU64(1000); // gas_fee
    const memo = new Uint8Array(128);
    p.bytesVarLen(BytesBlob.wrap(memo)); // memo

    const resp = callAccumulateWithOperand(p.finish());
    const assert = Assert.create();
    assert.isEqual(resp.result, 0, "transfer returns OK");
    return assert;
  }),

  test("eject: removes service", () => {
    const p = Encoder.create();
    p.varU64(EcalliIndex.Eject);
    p.varU64(99); // service to eject
    p.bytesFixLen(new Uint8Array(32)); // prev_code_hash

    const resp = callAccumulateWithOperand(p.finish());
    const assert = Assert.create();
    assert.isEqual(resp.result, 0, "eject returns OK");
    return assert;
  }),

  test("query: checks preimage status", () => {
    const p = Encoder.create();
    p.varU64(EcalliIndex.Query);
    p.bytesFixLen(new Uint8Array(32)); // hash
    p.varU64(64); // length

    const resp = callAccumulateWithOperand(p.finish());
    const assert = Assert.create();
    assert.isEqual(resp.result, -1, "query returns NONE");
    assert.isEqual(resp.data.raw.length, 8, "query returns r8");
    return assert;
  }),

  test("solicit: requests preimage", () => {
    const p = Encoder.create();
    p.varU64(EcalliIndex.Solicit);
    p.bytesFixLen(new Uint8Array(32)); // hash
    p.varU64(64); // length

    const resp = callAccumulateWithOperand(p.finish());
    const assert = Assert.create();
    assert.isEqual(resp.result, 0, "solicit returns OK");
    return assert;
  }),

  test("forget: cancels preimage solicitation", () => {
    const p = Encoder.create();
    p.varU64(EcalliIndex.Forget);
    p.bytesFixLen(new Uint8Array(32)); // hash
    p.varU64(64); // length

    const resp = callAccumulateWithOperand(p.finish());
    const assert = Assert.create();
    assert.isEqual(resp.result, 0, "forget returns OK");
    return assert;
  }),

  test("yield_result: provides result hash", () => {
    const p = Encoder.create();
    p.varU64(EcalliIndex.YieldResult);
    const hash = new Uint8Array(32);
    hash[0] = 0xff;
    p.bytesFixLen(hash);

    const resp = callAccumulateWithOperand(p.finish());
    const assert = Assert.create();
    assert.isEqual(resp.result, 0, "yield_result returns OK");
    return assert;
  }),

  test("provide: supplies preimage", () => {
    const p = Encoder.create();
    p.varU64(EcalliIndex.Provide);
    p.varU64(42); // service
    const preimage = new Uint8Array(16);
    preimage[0] = 0xab;
    p.bytesVarLen(BytesBlob.wrap(preimage));

    const resp = callAccumulateWithOperand(p.finish());
    const assert = Assert.create();
    assert.isEqual(resp.result, 0, "provide returns OK");
    return assert;
  }),
];
