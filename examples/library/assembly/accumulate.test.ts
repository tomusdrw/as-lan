import { AccumulateContext, Bytes32 } from "@fluffylabs/as-lan";
import { Assert, Test, TestPreimages, test } from "@fluffylabs/as-lan/test";

export const TESTS: Test[] = [
  test("mock: solicit counter increments on call", () => {
    const assert = Assert.create();
    TestPreimages.resetCounters();

    const ctx = AccumulateContext.create();
    ctx.preimages().solicit(Bytes32.zero(), 64);

    assert.isEqual(TestPreimages.getSolicitCount(), 1, "solicit count");
    assert.isEqual(TestPreimages.getForgetCount(), 0, "forget count");
    assert.isEqual(TestPreimages.getProvideCount(), 0, "provide count");
    return assert;
  }),
];
