import { runTestSuites, TestSuite } from "@fluffylabs/as-lan/test";
import * as accumulateTests from "./accumulate.test";
import * as refineTests from "./refine.test";

export function runAllTests(): void {
  runTestSuites([
    new TestSuite(refineTests.TESTS, "refine.test.ts"),
    new TestSuite(accumulateTests.TESTS, "accumulate.test.ts"),
  ]);
}
