import { AccumulateContext, BytesBlob, Decoder, Encoder } from "@fluffylabs/as-lan";
import {
  Assert,
  Test,
  TestAccumulate,
  TestEcalli,
  TestPreimages,
  TestPrivileged,
  TestServices,
  TestTransfer,
  test,
} from "@fluffylabs/as-lan/test";
import { EcalliIndex } from "./ecalli-index";
import { buildTransferItem, callAccumulate, callAccumulateWithOperand } from "./test-helpers";

export const TESTS: Test[] = [
  // === Accumulate: transfer processing ===

  test("accumulate: receives transfer", () => {
    const item = buildTransferItem(99, 42, 500, 10000);
    TestAccumulate.setItem(0, item);
    const raw = callAccumulate(1);
    const accCtx = AccumulateContext.create();
    const resp = accCtx.response.decode(Decoder.fromBlob(raw)).okay!;
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
    p.bytesVarLen(BytesBlob.empty()); // auth_queue
    p.varU64(2); // delegator
    p.varU64(3); // registrar
    p.bytesVarLen(BytesBlob.empty()); // auto_accum
    p.varU64(0); // auto_accum_count

    const resp = callAccumulateWithOperand(p.finishRaw());
    const assert = Assert.create();
    assert.isEqual(resp.result, 0, "bless returns OK");
    return assert;
  }),

  test("assign: assigns core", () => {
    const p = Encoder.create();
    p.varU64(EcalliIndex.Assign);
    p.varU64(0); // core
    p.bytesVarLen(BytesBlob.empty()); // auth_queue
    p.varU64(1); // assigners

    const resp = callAccumulateWithOperand(p.finishRaw());
    const assert = Assert.create();
    assert.isEqual(resp.result, 0, "assign returns OK");
    return assert;
  }),

  test("designate: sets next epoch validators", () => {
    const p = Encoder.create();
    p.varU64(EcalliIndex.Designate);
    p.bytesVarLen(BytesBlob.empty()); // validators

    const resp = callAccumulateWithOperand(p.finishRaw());
    const assert = Assert.create();
    assert.isEqual(resp.result, 0, "designate returns OK");
    return assert;
  }),

  test("checkpoint: commits state", () => {
    const p = Encoder.create();
    p.varU64(EcalliIndex.Checkpoint);

    const resp = callAccumulateWithOperand(p.finishRaw());
    const assert = Assert.create();
    assert.isEqual(resp.result, 1000000, "checkpoint returns gas");
    return assert;
  }),

  test("new_service: creates new service", () => {
    const p = Encoder.create();
    p.varU64(EcalliIndex.NewService);
    p.bytesFixLen(BytesBlob.zero(32)); // code_hash
    p.varU64(1024); // code_len
    p.varU64(100000); // gas
    p.varU64(50000); // allowance
    p.varU64(0); // gratis_storage
    p.varU64(u64(u32.MAX_VALUE)); // requested_id (auto)

    const resp = callAccumulateWithOperand(p.finishRaw());
    const assert = Assert.create();
    assert.isEqual(resp.result, 256, "new_service returns service ID 256");
    return assert;
  }),

  test("upgrade: upgrades service code", () => {
    const p = Encoder.create();
    p.varU64(EcalliIndex.Upgrade);
    p.bytesFixLen(BytesBlob.zero(32)); // code_hash
    p.varU64(100000); // gas
    p.varU64(50000); // allowance

    const resp = callAccumulateWithOperand(p.finishRaw());
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
    p.bytesVarLen(BytesBlob.zero(128)); // memo

    const resp = callAccumulateWithOperand(p.finishRaw());
    const assert = Assert.create();
    assert.isEqual(resp.result, 0, "transfer returns OK");
    return assert;
  }),

  test("eject: removes service", () => {
    const p = Encoder.create();
    p.varU64(EcalliIndex.Eject);
    p.varU64(99); // service to eject
    p.bytesFixLen(BytesBlob.zero(32)); // prev_code_hash

    const resp = callAccumulateWithOperand(p.finishRaw());
    const assert = Assert.create();
    assert.isEqual(resp.result, 0, "eject returns OK");
    return assert;
  }),

  test("query: checks preimage status", () => {
    const p = Encoder.create();
    p.varU64(EcalliIndex.Query);
    p.bytesFixLen(BytesBlob.zero(32)); // hash
    p.varU64(64); // length

    const resp = callAccumulateWithOperand(p.finishRaw());
    const assert = Assert.create();
    assert.isEqual(resp.result, -1, "query returns NONE");
    assert.isEqual(resp.data.raw.length, 8, "query returns r8");
    return assert;
  }),

  test("solicit: requests preimage", () => {
    const p = Encoder.create();
    p.varU64(EcalliIndex.Solicit);
    p.bytesFixLen(BytesBlob.zero(32)); // hash
    p.varU64(64); // length

    const resp = callAccumulateWithOperand(p.finishRaw());
    const assert = Assert.create();
    assert.isEqual(resp.result, 0, "solicit returns OK");
    return assert;
  }),

  test("forget: cancels preimage solicitation", () => {
    const p = Encoder.create();
    p.varU64(EcalliIndex.Forget);
    p.bytesFixLen(BytesBlob.zero(32)); // hash
    p.varU64(64); // length

    const resp = callAccumulateWithOperand(p.finishRaw());
    const assert = Assert.create();
    assert.isEqual(resp.result, 0, "forget returns OK");
    return assert;
  }),

  test("yield_result: provides result hash", () => {
    const p = Encoder.create();
    p.varU64(EcalliIndex.YieldResult);
    p.bytesFixLen(BytesBlob.parseBlob("0xff00000000000000000000000000000000000000000000000000000000000000").okay!);

    const resp = callAccumulateWithOperand(p.finishRaw());
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

    const resp = callAccumulateWithOperand(p.finishRaw());
    const assert = Assert.create();
    assert.isEqual(resp.result, 0, "provide returns OK");
    return assert;
  }),

  // === Deeper verification tests ===

  test("query: r8 carries configured slot info", () => {
    // r7=100 (preimage length), r8=7 (slot1=7, slot2=0)
    TestPreimages.setQueryResult(100, 7);
    const p = Encoder.create();
    p.varU64(EcalliIndex.Query);
    p.bytesFixLen(BytesBlob.zero(32));
    p.varU64(64);

    const resp = callAccumulateWithOperand(p.finishRaw());
    const assert = Assert.create();
    assert.isEqual(resp.result, 100, "query returns preimage length");
    assert.isEqual(resp.data.raw.length, 8, "r8 output length");
    // r8=7 in little-endian: 0x07 0x00 ...
    assert.isEqual(resp.data.raw[0], 7, "r8 byte 0 (slot1)");
    assert.isEqual(resp.data.raw[1], 0, "r8 byte 1");
    return assert;
  }),

  test("new_service: incrementing service IDs", () => {
    TestEcalli.reset();
    const p1 = Encoder.create();
    p1.varU64(EcalliIndex.NewService);
    p1.bytesFixLen(BytesBlob.zero(32));
    p1.varU64(1024);
    p1.varU64(100000);
    p1.varU64(50000);
    p1.varU64(0);
    p1.varU64(u64(u32.MAX_VALUE));
    const resp1 = callAccumulateWithOperand(p1.finishRaw());

    const p2 = Encoder.create();
    p2.varU64(EcalliIndex.NewService);
    p2.bytesFixLen(BytesBlob.zero(32));
    p2.varU64(1024);
    p2.varU64(100000);
    p2.varU64(50000);
    p2.varU64(0);
    p2.varU64(u64(u32.MAX_VALUE));
    const resp2 = callAccumulateWithOperand(p2.finishRaw());

    const assert = Assert.create();
    assert.isEqual(resp1.result, 256, "first new_service returns ID 256");
    assert.isEqual(resp2.result, 257, "second new_service returns ID 257");
    return assert;
  }),

  test("bless: captures scalar arguments", () => {
    TestEcalli.reset();
    const p = Encoder.create();
    p.varU64(EcalliIndex.Bless);
    p.varU64(10); // manager
    p.bytesVarLen(BytesBlob.empty()); // auth_queue
    p.varU64(20); // delegator
    p.varU64(30); // registrar
    p.bytesVarLen(BytesBlob.empty()); // auto_accum
    p.varU64(5); // auto_accum_count

    const resp = callAccumulateWithOperand(p.finishRaw());
    const assert = Assert.create();
    assert.isEqual(resp.result, 0, "bless returns OK");
    assert.isEqual(TestPrivileged.getLastBlessManager(), 10, "manager");
    assert.isEqual(TestPrivileged.getLastBlessDelegator(), 20, "delegator");
    assert.isEqual(TestPrivileged.getLastBlessRegistrar(), 30, "registrar");
    assert.isEqual(TestPrivileged.getLastBlessAutoAccumCount(), 5, "auto_accum_count");
    return assert;
  }),

  test("assign: captures scalar arguments", () => {
    TestEcalli.reset();
    const p = Encoder.create();
    p.varU64(EcalliIndex.Assign);
    p.varU64(7); // core
    p.bytesVarLen(BytesBlob.empty()); // auth_queue
    p.varU64(42); // new_assigner

    const resp = callAccumulateWithOperand(p.finishRaw());
    const assert = Assert.create();
    assert.isEqual(resp.result, 0, "assign returns OK");
    assert.isEqual(TestPrivileged.getLastAssignCore(), 7, "core");
    assert.isEqual(TestPrivileged.getLastAssignNewAssigner(), 42, "new_assigner");
    return assert;
  }),

  test("upgrade: captures arguments", () => {
    TestEcalli.reset();
    const p = Encoder.create();
    p.varU64(EcalliIndex.Upgrade);
    p.bytesFixLen(BytesBlob.zero(32)); // code_hash
    p.varU64(200000); // gas
    p.varU64(100000); // allowance

    const resp = callAccumulateWithOperand(p.finishRaw());
    const assert = Assert.create();
    assert.isEqual(resp.result, 0, "upgrade returns OK");
    assert.isEqual(TestServices.getLastUpgradeGas(), 200000, "gas");
    assert.isEqual(TestServices.getLastUpgradeAllowance(), 100000, "allowance");
    return assert;
  }),

  test("solicit: returns HUH when configured", () => {
    TestPreimages.setSolicitResult(-9);
    const p = Encoder.create();
    p.varU64(EcalliIndex.Solicit);
    p.bytesFixLen(BytesBlob.zero(32));
    p.varU64(64);

    const resp = callAccumulateWithOperand(p.finishRaw());
    const assert = Assert.create();
    assert.isEqual(resp.result, -9, "solicit returns HUH");
    return assert;
  }),

  test("transfer ecalli: returns LOW when configured", () => {
    TestTransfer.setTransferResult(-1);
    const p = Encoder.create();
    p.varU64(EcalliIndex.Transfer);
    p.varU64(100);
    p.varU64(500);
    p.varU64(1000);
    p.bytesVarLen(BytesBlob.zero(128));

    const resp = callAccumulateWithOperand(p.finishRaw());
    const assert = Assert.create();
    assert.isEqual(resp.result, -1, "transfer returns LOW");
    return assert;
  }),
];
