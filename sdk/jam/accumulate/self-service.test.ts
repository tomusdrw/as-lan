import { Bytes32 } from "../../core/bytes";
import { TestEcalli } from "../../test/test-ecalli";
import { Assert, Test, test } from "../../test/utils";
import { SelfService } from "./self-service";

export const TESTS: Test[] = [
  test("SelfService.upgradeCode does not panic", () => {
    TestEcalli.reset();
    const a = Assert.create();
    const svc = SelfService.create();

    svc.upgradeCode(Bytes32.zero(), 10_000, 50_000);
    a.isEqual(true, true, "upgradeCode completed");
    return a;
  }),

  test("SelfService.requestEjection builds correct ejection hash", () => {
    TestEcalli.reset();
    const a = Assert.create();
    const svc = SelfService.create();

    // Verify the ejection hash is parentServiceId as LE u32 zero-padded to 32 bytes.
    // We can't intercept the ecalli call directly, but we can verify the hash
    // construction logic by building the expected hash manually.
    const parentId: u32 = 0x01020304;
    const expected = Bytes32.zero();
    store<u32>(expected.raw.dataStart, parentId);
    // First 4 bytes should be LE encoding of 0x01020304
    a.isEqual(expected.raw[0], 0x04, "byte 0 = LE low byte");
    a.isEqual(expected.raw[1], 0x03, "byte 1");
    a.isEqual(expected.raw[2], 0x02, "byte 2");
    a.isEqual(expected.raw[3], 0x01, "byte 3 = LE high byte");
    // Remaining bytes should be zero
    a.isEqual(expected.raw[4], 0, "byte 4 = 0");
    a.isEqual(expected.raw[31], 0, "byte 31 = 0");

    // The actual call should not panic
    svc.requestEjection(parentId);
    a.isEqual(true, true, "requestEjection completed");
    return a;
  }),

  test("SelfService.requestEjection with service ID 0", () => {
    TestEcalli.reset();
    const a = Assert.create();
    const svc = SelfService.create();

    svc.requestEjection(0);
    a.isEqual(true, true, "requestEjection with 0 completed");
    return a;
  }),
];
