import * as bytes from "../core/bytes.test";
import * as decode from "../core/codec/decode.test";
import * as encode from "../core/codec/encode.test";
import * as roundtrip from "../core/codec/index.test";
import * as accumulateItem from "../jam/accumulate-item.test";
import * as service from "../jam/service.test";

import { runTestSuites, TestSuite } from "./utils";

export function runAllTests(): void {
  runTestSuites([
    new TestSuite(bytes.TESTS, "bytes.ts"),
    new TestSuite(decode.TESTS, "decode.ts"),
    new TestSuite(encode.TESTS, "encode.ts"),
    new TestSuite(roundtrip.TESTS, "roundtrip.ts"),
    new TestSuite(accumulateItem.TESTS, "accumulate-item.ts"),
    new TestSuite(service.TESTS, "service.ts"),
  ]);
}
