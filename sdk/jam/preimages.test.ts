import { Bytes32, BytesBlob } from "../core/bytes";
import { EcalliResult } from "../ecalli";
import { TestEcalli, TestHistoricalLookup, TestLookup, TestPreimages } from "../test/test-ecalli";
import { Assert, Test, test } from "../test/utils";
import { AccumulatePreimages, ForgetError, ProvideError, SolicitError } from "./accumulate/preimages";
import { PreimageStatusKind, Preimages } from "./preimages";
import { RefinePreimages } from "./refine/preimages";

export const TESTS: Test[] = [
  // ─── Preimages.lookup ─────────────────────────────────────────────────

  test("Preimages.lookup returns BytesBlob", () => {
    TestEcalli.reset();
    const a = Assert.create();
    const data = BytesBlob.parseBlob("0xdeadbeef").okay!;
    TestLookup.setPreimage(data.raw);

    const p = Preimages.create();
    const result = p.lookup(Bytes32.zero());
    a.isEqual(result.isSome, true, "should be some");
    a.isEqual(result.val!.length, 4, "length");
    a.isEqual(result.val!.raw[0], 0xde, "byte 0");
    a.isEqual(result.val!.raw[3], 0xef, "byte 3");
    return a;
  }),

  test("Preimages.lookup returns none when NONE", () => {
    TestEcalli.reset();
    const a = Assert.create();
    TestLookup.setNone();

    const p = Preimages.create();
    const result = p.lookup(Bytes32.zero());
    a.isEqual(result.isSome, false, "should be none");
    return a;
  }),

  test("Preimages.lookup auto-expands buffer", () => {
    TestEcalli.reset();
    const a = Assert.create();
    const large = BytesBlob.zero(2048);
    for (let i = 0; i < 2048; i++) large.raw[i] = u8(i & 0xff);
    TestLookup.setPreimage(large.raw);

    // Small buffer forces auto-expansion
    const p = Preimages.create(64);
    const result = p.lookup(Bytes32.zero());
    a.isEqual(result.isSome, true, "should be some");
    a.isEqual(result.val!.length, 2048, "length");
    a.isEqual(result.val!.raw[0], 0, "byte 0");
    a.isEqual(result.val!.raw[255], 255, "byte 255");
    return a;
  }),

  // ─── RefinePreimages.lookup (delegation) ──────────────────────────────

  test("RefinePreimages.lookup delegates to Preimages", () => {
    TestEcalli.reset();
    const a = Assert.create();
    const data = BytesBlob.parseBlob("0xcafe").okay!;
    TestLookup.setPreimage(data.raw);

    const rp = RefinePreimages.create();
    const result = rp.lookup(Bytes32.zero());
    a.isEqual(result.isSome, true, "should be some");
    a.isEqual(result.val!.length, 2, "length");
    a.isEqual(result.val!.raw[0], 0xca, "byte 0");
    return a;
  }),

  // ─── RefinePreimages.historicalLookup ─────────────────────────────────

  test("RefinePreimages.historicalLookup returns BytesBlob", () => {
    TestEcalli.reset();
    const a = Assert.create();
    const data = BytesBlob.parseBlob("0xaabbccdd").okay!;
    TestHistoricalLookup.setPreimage(data.raw);

    const rp = RefinePreimages.create();
    const result = rp.historicalLookup(Bytes32.zero());
    a.isEqual(result.isSome, true, "should be some");
    a.isEqual(result.val!.length, 4, "length");
    a.isEqual(result.val!.raw[0], 0xaa, "byte 0");
    a.isEqual(result.val!.raw[3], 0xdd, "byte 3");
    return a;
  }),

  test("RefinePreimages.historicalLookup returns none when NONE", () => {
    TestEcalli.reset();
    const a = Assert.create();
    TestHistoricalLookup.setNone();

    const rp = RefinePreimages.create();
    const result = rp.historicalLookup(Bytes32.zero());
    a.isEqual(result.isSome, false, "should be none");
    return a;
  }),

  // ─── AccumulatePreimages.query ────────────────────────────────────────

  test("AccumulatePreimages.query returns none for NONE", () => {
    TestEcalli.reset();
    const a = Assert.create();
    // Default mock returns NONE
    const ap = AccumulatePreimages.create();
    const result = ap.query(Bytes32.zero(), 64);
    a.isEqual(result.isSome, false, "should be none");
    return a;
  }),

  test("AccumulatePreimages.query decodes Requested", () => {
    TestEcalli.reset();
    const a = Assert.create();
    // Requested: r7 = 0 (kind=0, slot0=0), r8 = 0
    TestPreimages.setQueryResult(0, 0);

    const ap = AccumulatePreimages.create();
    const result = ap.query(Bytes32.zero(), 64);
    a.isEqual(result.isSome, true, "should be some");
    a.isEqual(result.val!.kind, PreimageStatusKind.Requested, "kind");
    return a;
  }),

  test("AccumulatePreimages.query decodes Available", () => {
    TestEcalli.reset();
    const a = Assert.create();
    // Available: r7 = (slot0 << 32) | 1, r8 = 0
    const slot0: u64 = 42;
    TestPreimages.setQueryResult(i64((slot0 << 32) | 1), 0);

    const ap = AccumulatePreimages.create();
    const result = ap.query(Bytes32.zero(), 64);
    a.isEqual(result.isSome, true, "should be some");
    a.isEqual(result.val!.kind, PreimageStatusKind.Available, "kind");
    a.isEqual(result.val!.slot0, 42, "slot0");
    return a;
  }),

  test("AccumulatePreimages.query decodes Unavailable", () => {
    TestEcalli.reset();
    const a = Assert.create();
    // Unavailable: r7 = (slot0 << 32) | 2, r8 = slot1
    const slot0: u64 = 10;
    const slot1: u64 = 20;
    TestPreimages.setQueryResult(i64((slot0 << 32) | 2), i64(slot1));

    const ap = AccumulatePreimages.create();
    const result = ap.query(Bytes32.zero(), 64);
    a.isEqual(result.isSome, true, "should be some");
    a.isEqual(result.val!.kind, PreimageStatusKind.Unavailable, "kind");
    a.isEqual(result.val!.slot0, 10, "slot0");
    a.isEqual(result.val!.slot1, 20, "slot1");
    return a;
  }),

  test("AccumulatePreimages.query decodes Reavailable", () => {
    TestEcalli.reset();
    const a = Assert.create();
    // Reavailable: r7 = (slot0 << 32) | 3, r8 = (slot2 << 32) | slot1
    const slot0: u64 = 5;
    const slot1: u64 = 15;
    const slot2: u64 = 25;
    TestPreimages.setQueryResult(i64((slot0 << 32) | 3), i64((slot2 << 32) | slot1));

    const ap = AccumulatePreimages.create();
    const result = ap.query(Bytes32.zero(), 64);
    a.isEqual(result.isSome, true, "should be some");
    a.isEqual(result.val!.kind, PreimageStatusKind.Reavailable, "kind");
    a.isEqual(result.val!.slot0, 5, "slot0");
    a.isEqual(result.val!.slot1, 15, "slot1");
    a.isEqual(result.val!.slot2, 25, "slot2");
    return a;
  }),

  // ─── AccumulatePreimages.solicit ──────────────────────────────────────

  test("AccumulatePreimages.solicit returns ok on success", () => {
    TestEcalli.reset();
    const a = Assert.create();
    TestPreimages.setSolicitResult(0); // OK

    const ap = AccumulatePreimages.create();
    const result = ap.solicit(Bytes32.zero(), 64);
    a.isEqual(result.isOkay, true, "should be ok");
    return a;
  }),

  test("AccumulatePreimages.solicit returns Huh error", () => {
    TestEcalli.reset();
    const a = Assert.create();
    TestPreimages.setSolicitResult(EcalliResult.HUH);

    const ap = AccumulatePreimages.create();
    const result = ap.solicit(Bytes32.zero(), 64);
    a.isEqual(result.isError, true, "should be error");
    a.isEqual(result.error, SolicitError.Huh, "error kind");
    return a;
  }),

  test("AccumulatePreimages.solicit returns Full error", () => {
    TestEcalli.reset();
    const a = Assert.create();
    TestPreimages.setSolicitResult(EcalliResult.FULL);

    const ap = AccumulatePreimages.create();
    const result = ap.solicit(Bytes32.zero(), 64);
    a.isEqual(result.isError, true, "should be error");
    a.isEqual(result.error, SolicitError.Full, "error kind");
    return a;
  }),

  // ─── AccumulatePreimages.forget ───────────────────────────────────────

  test("AccumulatePreimages.forget returns ok on success", () => {
    TestEcalli.reset();
    const a = Assert.create();
    TestPreimages.setForgetResult(0); // OK

    const ap = AccumulatePreimages.create();
    const result = ap.forget(Bytes32.zero(), 64);
    a.isEqual(result.isOkay, true, "should be ok");
    return a;
  }),

  test("AccumulatePreimages.forget returns Huh error", () => {
    TestEcalli.reset();
    const a = Assert.create();
    TestPreimages.setForgetResult(EcalliResult.HUH);

    const ap = AccumulatePreimages.create();
    const result = ap.forget(Bytes32.zero(), 64);
    a.isEqual(result.isError, true, "should be error");
    a.isEqual(result.error, ForgetError.Huh, "error kind");
    return a;
  }),

  // ─── AccumulatePreimages.provide ──────────────────────────────────────

  test("AccumulatePreimages.provide returns ok on success", () => {
    TestEcalli.reset();
    const a = Assert.create();
    TestPreimages.setProvideResult(0); // OK

    const ap = AccumulatePreimages.create();
    const result = ap.provide(BytesBlob.zero(64));
    a.isEqual(result.isOkay, true, "should be ok");
    return a;
  }),

  test("AccumulatePreimages.provide returns Who error", () => {
    TestEcalli.reset();
    const a = Assert.create();
    TestPreimages.setProvideResult(EcalliResult.WHO);

    const ap = AccumulatePreimages.create();
    const result = ap.provide(BytesBlob.zero(64));
    a.isEqual(result.isError, true, "should be error");
    a.isEqual(result.error, ProvideError.Who, "error kind");
    return a;
  }),

  test("AccumulatePreimages.provide returns Huh error", () => {
    TestEcalli.reset();
    const a = Assert.create();
    TestPreimages.setProvideResult(EcalliResult.HUH);

    const ap = AccumulatePreimages.create();
    const result = ap.provide(BytesBlob.zero(64));
    a.isEqual(result.isError, true, "should be error");
    a.isEqual(result.error, ProvideError.Huh, "error kind");
    return a;
  }),
];
