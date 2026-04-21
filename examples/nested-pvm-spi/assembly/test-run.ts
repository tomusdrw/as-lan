import { runTestSuites, TestSuite } from "@fluffylabs/as-lan/test";
import * as refineTest from "./refine.test";

export function runAllTests(): void {
  runTestSuites([TestSuite.create(refineTest.TESTS, "refine.ts")]);
}
