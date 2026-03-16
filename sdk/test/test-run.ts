import * as bytes from "../core/bytes.test";
import * as decode from "../core/codec/decode.test";
import * as encode from "../core/codec/encode.test";
import * as roundtrip from "../core/codec/index.test";

import { runTestSuites, TestSuite } from "./utils";

export function runAllTests(): void {
  runTestSuites([
    new TestSuite(bytes.TESTS, "bytes.ts"),
    new TestSuite(decode.TESTS, "decode.ts"),
    new TestSuite(encode.TESTS, "encode.ts"),
    new TestSuite(roundtrip.TESTS, "roundtrip.ts"),
  ]);
}
