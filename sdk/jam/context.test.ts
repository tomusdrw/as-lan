import { Bytes32, BytesBlob } from "../core/bytes";
import { EcalliResult } from "../ecalli";
import { TestEcalli, TestExportSegment, TestGas } from "../test/test-ecalli";
import { Assert, Test, test } from "../test/utils";
import { AccumulateContext } from "./accumulate/context";
import { ExportSegmentError, RefineContext } from "./refine/context";

export const TESTS: Test[] = [
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
];
