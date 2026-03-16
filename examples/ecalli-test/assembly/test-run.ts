import { runTestSuites, TestSuite } from "@fluffylabs/as-lan/test";
import * as sdk from "./index.test";

export function runAllTests(): void {
  runTestSuites([new TestSuite(sdk.TESTS, "ecalli-test.ts")]);
}
