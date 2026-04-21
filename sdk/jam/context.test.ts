import { Bytes32, BytesBlob } from "../core/bytes";
import { Encoder } from "../core/codec/encode";
import { EcalliResult } from "../ecalli";
import { TestEcalli, TestExportSegment, TestGas } from "../test/test-ecalli";
import { Assert, Test, test } from "../test/utils";
import { AccumulateContext } from "./accumulate/context";
import { AuthorizeContext } from "./authorize/context";
import { ExportSegmentError, RefineContext } from "./refine/context";

export const TESTS: Test[] = [
  // ─── remainingGas (all contexts) ──────────────────────────────────

  test("RefineContext.remainingGas returns gas value", () => {
    TestEcalli.reset();
    const a = Assert.create();
    const ctx = RefineContext.create();

    TestGas.set(500_000);
    a.isEqual(ctx.remainingGas(), 500_000, "remaining gas");
    return a;
  }),

  test("AccumulateContext.remainingGas returns gas value", () => {
    TestEcalli.reset();
    const a = Assert.create();
    const ctx = AccumulateContext.create();

    TestGas.set(750_000);
    a.isEqual(ctx.remainingGas(), 750_000, "remaining gas");
    return a;
  }),

  test("AuthorizeContext.remainingGas returns gas value", () => {
    TestEcalli.reset();
    const a = Assert.create();
    const ctx = AuthorizeContext.create();

    TestGas.set(300_000);
    a.isEqual(ctx.remainingGas(), 300_000, "remaining gas");
    return a;
  }),

  // ─── RefineContext.exportSegment ────────────────────────────────────

  test("RefineContext.exportSegment returns segment index", () => {
    TestEcalli.reset();
    const a = Assert.create();
    const ctx = RefineContext.create();

    const segment = BytesBlob.parseBlob("0xdeadbeef").okay!;
    const result = ctx.exportSegment(segment);
    a.isEqual(result.isOkay, true, "should be ok");
    a.isEqual(result.okay, 0, "first segment index = 0");

    const result2 = ctx.exportSegment(segment);
    a.isEqual(result2.isOkay, true, "should be ok");
    a.isEqual(result2.okay, 1, "second segment index = 1");
    return a;
  }),

  test("RefineContext.exportSegment returns Full on FULL", () => {
    TestEcalli.reset();
    const a = Assert.create();
    const ctx = RefineContext.create();

    TestExportSegment.setResult(EcalliResult.FULL);
    const segment = BytesBlob.parseBlob("0xdeadbeef").okay!;
    const result = ctx.exportSegment(segment);
    a.isEqual(result.isError, true, "should be error");
    a.isEqual(result.error, ExportSegmentError.Full, "should be Full");
    return a;
  }),

  test("RefineContext.exportSegment works with empty segment", () => {
    TestEcalli.reset();
    const a = Assert.create();
    const ctx = RefineContext.create();

    const result = ctx.exportSegment(BytesBlob.empty());
    a.isEqual(result.isOkay, true, "should be ok");
    a.isEqual(result.okay, 0, "segment index = 0");
    return a;
  }),

  test("RefineContext.exportSegment passes through host index", () => {
    TestEcalli.reset();
    const a = Assert.create();
    const ctx = RefineContext.create();

    TestExportSegment.setResult(42);
    const segment = BytesBlob.parseBlob("0xaa").okay!;
    const result = ctx.exportSegment(segment);
    a.isEqual(result.isOkay, true, "should be ok");
    a.isEqual(result.okay, 42, "host-returned index");
    return a;
  }),

  test("RefineContext.nestedPvmFromSpi creates a NestedPvm", () => {
    TestEcalli.reset();
    const a = Assert.create();
    const ctx = RefineContext.create();
    // Minimal SPI blob: empty regions, 4-byte zero code.
    const e = Encoder.create(32);
    e.u24(0); // roLength
    e.u24(0); // rwLength
    e.u16(0); // heapPages
    e.u24(0); // stackSize
    e.u32(4); // codeLength
    e.u8(0);
    e.u8(0);
    e.u8(0);
    e.u8(0);
    const blob = e.finish();
    const vm = ctx.nestedPvmFromSpi(blob, BytesBlob.empty(), 1);
    a.isEqual(vm.getRegister(7), 0xfeff_0000, "r7 = args start");
    return a;
  }),

  // ─── AccumulateContext.checkpoint ───────────────────────────────────

  test("AccumulateContext.checkpoint returns remaining gas", () => {
    TestEcalli.reset();
    const a = Assert.create();
    const ctx = AccumulateContext.create();

    TestGas.set(42_000);
    const gas = ctx.checkpoint();
    a.isEqual(gas, 42_000, "remaining gas");
    return a;
  }),

  test("AccumulateContext.checkpoint returns zero gas", () => {
    TestEcalli.reset();
    const a = Assert.create();
    const ctx = AccumulateContext.create();

    TestGas.set(0);
    const gas = ctx.checkpoint();
    a.isEqual(gas, 0, "zero gas");
    return a;
  }),

  test("AccumulateContext.checkpoint reflects updated gas", () => {
    TestEcalli.reset();
    const a = Assert.create();
    const ctx = AccumulateContext.create();

    TestGas.set(100_000);
    a.isEqual(ctx.checkpoint(), 100_000, "first checkpoint");

    TestGas.set(50_000);
    a.isEqual(ctx.checkpoint(), 50_000, "second checkpoint after gas change");
    return a;
  }),

  // ─── AccumulateContext.yieldResult ──────────────────────────────────

  test("AccumulateContext.yieldResult does not panic", () => {
    TestEcalli.reset();
    const a = Assert.create();
    const ctx = AccumulateContext.create();

    const hash = Bytes32.zero();
    ctx.yieldResult(hash);
    // If we reach here, the call succeeded (no panic).
    a.isEqual(true, true, "yieldResult completed");
    return a;
  }),

  test("AccumulateContext.yieldResult accepts non-zero hash", () => {
    TestEcalli.reset();
    const a = Assert.create();
    const ctx = AccumulateContext.create();

    const raw = new Uint8Array(32);
    for (let i = 0; i < 32; i++) raw[i] = u8(i + 1);
    const hash = Bytes32.wrapUnchecked(raw);
    ctx.yieldResult(hash);
    a.isEqual(true, true, "yieldResult with non-zero hash completed");
    return a;
  }),
];
