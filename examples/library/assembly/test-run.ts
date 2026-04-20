import { runTestSuites, TestSuite } from "@fluffylabs/as-lan/test";
import * as refineTests from "./refine.test";

export function runAllTests(): void {
  runTestSuites([TestSuite.create(refineTests.TESTS, "refine.test.ts")]);
}
