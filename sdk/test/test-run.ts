import * as bytes from "../core/bytes.test";
import * as decode from "../core/codec/decode.test";
import * as encode from "../core/codec/encode.test";
import * as roundtrip from "../core/codec/index.test";
import * as accountInfo from "../jam/account-info.test";
import * as accumulateItem from "../jam/accumulate/item.test";
import * as service from "../jam/service.test";
import * as workPackage from "../jam/work-package.test";

import { runTestSuites, TestSuite } from "./utils";

export function runAllTests(): void {
  runTestSuites([
    TestSuite.create(bytes.TESTS, "bytes.ts"),
    TestSuite.create(decode.TESTS, "decode.ts"),
    TestSuite.create(encode.TESTS, "encode.ts"),
    TestSuite.create(roundtrip.TESTS, "roundtrip.ts"),
    TestSuite.create(accountInfo.TESTS, "account-info.ts"),
    TestSuite.create(accumulateItem.TESTS, "accumulate-item.ts"),
    TestSuite.create(service.TESTS, "service.ts"),
    TestSuite.create(workPackage.TESTS, "work-package.ts"),
  ]);
}
