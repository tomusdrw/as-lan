import { runTestSuites, TestSuite } from "@fluffylabs/as-lan/test";
import * as sdk from "./index.test";

export function runAllTests(): void {
  runTestSuites([TestSuite.create(sdk.TESTS, "fibonacci.ts")]);
}
