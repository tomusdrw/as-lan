import { runTestSuites, TestSuite } from "@fluffylabs/as-lan/test";
import * as accumulateTests from "./accumulate.test";
import * as authorizeTests from "./authorize.test";
import * as refineTests from "./refine.test";

export function runAllTests(): void {
  runTestSuites([
    TestSuite.create(refineTests.TESTS, "refine.test.ts"),
    TestSuite.create(accumulateTests.TESTS, "accumulate.test.ts"),
    TestSuite.create(authorizeTests.TESTS, "authorize.test.ts"),
  ]);
}
