import { runTestSuites, TestSuite } from "@fluffylabs/as-lan/test";
import * as allEcalliTests from "./all-ecalli.test";

export function runAllTests(): void {
  runTestSuites([TestSuite.create(allEcalliTests.TESTS, "all-ecalli.test.ts")]);
}
