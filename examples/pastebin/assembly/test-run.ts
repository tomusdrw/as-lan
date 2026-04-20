import { runTestSuites, TestSuite } from "@fluffylabs/as-lan/test";
import * as pastebinTests from "./pastebin.test";

export function runAllTests(): void {
  runTestSuites([
    TestSuite.create(pastebinTests.TESTS, "pastebin.test.ts"),
  ]);
}
