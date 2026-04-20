import { runTestSuites, TestSuite } from "@fluffylabs/as-lan/test";
import * as blake2bTests from "./crypto/blake2b.test";
import * as pastebinTests from "./pastebin.test";

export function runAllTests(): void {
  runTestSuites([
    TestSuite.create(blake2bTests.TESTS, "blake2b.test.ts"),
    TestSuite.create(pastebinTests.TESTS, "pastebin.test.ts"),
  ]);
}
