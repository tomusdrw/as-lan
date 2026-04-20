import { runTestSuites, TestSuite } from "@fluffylabs/as-lan/test";
import * as blake2bTests from "./crypto/blake2b.test";

export function runAllTests(): void {
  runTestSuites([
    TestSuite.create(blake2bTests.TESTS, "blake2b.test.ts"),
  ]);
}
