import { BytesBlob, InvokeIo, Machine } from "@fluffylabs/as-lan";
import { Assert, Test, TestMachine, test } from "@fluffylabs/as-lan/test";

export const TESTS: Test[] = [
  test("mock: setInvokeIoR7 writes r7 into InvokeIo after invoke", () => {
    const assert = Assert.create();
    TestMachine.setInvokeResult(0, 0); // Halt, r8 = 0
    TestMachine.setInvokeIoR7(0x0000000500000100); // len=5 in high, ptr=0x100 in low

    const r = Machine.create(BytesBlob.zero(4), 0);
    if (r.isError) {
      assert.fail("machine create failed");
      return assert;
    }
    const m = r.okay;
    const io = InvokeIo.create(1000);
    m.invoke(io);
    assert.isEqual(io.getRegister(7), 0x0000000500000100, "r7 written");
    return assert;
  }),
];
