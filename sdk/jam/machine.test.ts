import { Assert, Test, test } from "../test/utils";
import { ExitReason, InvokeIo, InvokeOutcome } from "./refine/machine";

export const TESTS: Test[] = [
  test("InvokeIo.create sets initial gas", () => {
    const a = Assert.create();
    const io = InvokeIo.create(1_000_000);
    a.isEqual(io.gas, 1_000_000, "initial gas");
    return a;
  }),

  test("InvokeIo gas is read/write", () => {
    const a = Assert.create();
    const io = InvokeIo.create(500);
    io.gas = 200;
    a.isEqual(io.gas, 200, "updated gas");
    return a;
  }),

  test("InvokeIo registers default to zero", () => {
    const a = Assert.create();
    const io = InvokeIo.create(100);
    for (let i: u32 = 0; i < 13; i++) {
      a.isEqual(io.getRegister(i), 0, `register ${i}`);
    }
    return a;
  }),

  test("InvokeIo get/set register roundtrip", () => {
    const a = Assert.create();
    const io = InvokeIo.create(100);
    io.setRegister(7, 0xdeadbeef);
    a.isEqual(io.getRegister(7), 0xdeadbeef, "r7 value");
    io.setRegister(0, 42);
    a.isEqual(io.getRegister(0), 42, "r0 value");
    a.isEqual(io.getRegister(7), 0xdeadbeef, "r7 unchanged");
    return a;
  }),
  test("InvokeOutcome holds reason, r8, and io reference", () => {
    const a = Assert.create();
    const io = InvokeIo.create(1000);
    const outcome = InvokeOutcome.create(ExitReason.Host, 12, io);
    a.isEqual(outcome.reason, ExitReason.Host, "reason");
    a.isEqual(outcome.r8, 12, "r8 host call index");
    a.isEqual(outcome.io.gas, 1000, "io reference preserved");
    return a;
  }),
];
