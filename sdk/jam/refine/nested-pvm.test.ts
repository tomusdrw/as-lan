import { BytesBlob } from "../../core/bytes";
import { Encoder } from "../../core/codec/encode";
import { EcalliResult } from "../../ecalli";
import { TestEcalli, TestMachine } from "../../test/test-ecalli";
import { Assert, Test, test } from "../../test/utils";
import { ExitReason } from "./machine";
import { NestedPvm, SpiError } from "./nested-pvm";

const U24_MAX: u32 = 0x00ff_ffff;

/** Build an SPI blob with the given regions. Fails loud on header-field overflow. */
function buildSpi(
  roBytes: BytesBlob,
  rwBytes: BytesBlob,
  heapPages: u16,
  stackSize: u32,
  codeBytes: BytesBlob,
): BytesBlob {
  assert(u32(roBytes.length) <= U24_MAX, "buildSpi: roLength exceeds u24");
  assert(u32(rwBytes.length) <= U24_MAX, "buildSpi: rwLength exceeds u24");
  assert(stackSize <= U24_MAX, "buildSpi: stackSize exceeds u24");

  const e = Encoder.create(64);
  // Header: u24 roLength, u24 rwLength, u16 heapPages, u24 stackSize.
  e.u24(u32(roBytes.length));
  e.u24(u32(rwBytes.length));
  e.u16(heapPages);
  e.u24(stackSize);
  // Regions.
  e.bytesFixLen(roBytes);
  e.bytesFixLen(rwBytes);
  e.u32(u32(codeBytes.length));
  e.bytesFixLen(codeBytes);
  return e.finish();
}

export const TESTS: Test[] = [
  test("NestedPvm.fromSpi decodes header and slices", () => {
    TestEcalli.reset();
    const a = Assert.create();
    const ro = BytesBlob.parseBlob("0x010203").okay!;
    const rw = BytesBlob.parseBlob("0x0908").okay!;
    const code = BytesBlob.parseBlob("0xaa0000bb").okay!;
    const blob = buildSpi(ro, rw, 2, 4096, code);
    const args = BytesBlob.empty();
    const vm = NestedPvm.fromSpi(blob, args, 1_000_000);
    a.isEqual(vm.getRegister(0), 0xffff_0000, "r0 initial");
    a.isEqual(vm.getRegister(1), 0xfefe_0000, "r1 = stack segment end");
    a.isEqual(vm.getRegister(7), 0xfeff_0000, "r7 = args segment start");
    a.isEqual(vm.getRegister(8), 0, "r8 = args length");
    a.isEqual(vm.remainingGas(), 1_000_000, "gas");
    return a;
  }),

  test("NestedPvm.fromSpi allocates RO pages then pokes RO bytes", () => {
    TestEcalli.reset();
    const a = Assert.create();
    const ro = BytesBlob.zero(10);
    for (let i = 0; i < 10; i++) ro.raw[i] = u8(i + 1);
    const blob = buildSpi(ro, BytesBlob.empty(), 0, 0, BytesBlob.zero(4));
    NestedPvm.fromSpi(blob, BytesBlob.empty(), 1_000);

    a.isEqual(TestMachine.pagesLogLength(), 1, "exactly one pages() call");
    const roStartPage: u32 = 0x0001_0000 / 4096; // = 16
    a.isEqual(TestMachine.pagesLogField(0, 1), roStartPage, "RO start page");
    a.isEqual(TestMachine.pagesLogField(0, 2), 1, "RO page count (10 bytes → 1 page)");
    a.isEqual(TestMachine.pagesLogField(0, 3), 1, "RO access = Read");

    a.isEqual(TestMachine.pokeLogLength(), 1, "exactly one poke() call");
    a.isEqual(TestMachine.pokeLogField(0, 1), 0x0001_0000, "poke dest = RO start");
    a.isEqual(TestMachine.pokeLogField(0, 2), 10, "poke length = ro length");
    const copied = BytesBlob.zero(10);
    TestMachine.pokeLogData(0, copied);
    for (let i = 0; i < 10; i++) a.isEqual(copied.raw[i], u8(i + 1), `byte ${i.toString()}`);
    return a;
  }),

  test("NestedPvm.fromSpi configures RW, heap, stack, args regions", () => {
    TestEcalli.reset();
    const a = Assert.create();
    const rw = BytesBlob.parseBlob("0xaa0000bb").okay!;
    const args = BytesBlob.zero(5);
    args.raw[0] = 0xcc;
    const stackSize: u32 = 2 * 4096 + 1; // rounds up to 3 pages.
    const heapPages: u16 = 2;
    const blob = buildSpi(BytesBlob.empty(), rw, heapPages, stackSize, BytesBlob.zero(4));
    NestedPvm.fromSpi(blob, args, 1_000);

    const rwPage: u32 = 0x0002_0000 / 4096; // 32
    const heapPage: u32 = rwPage + 1;
    const stackPages: u32 = 3;
    const stackPage: u32 = (0xfefe_0000 - stackPages * 4096) / 4096;
    const argsPage: u32 = 0xfeff_0000 / 4096;
    const n = TestMachine.pagesLogLength();
    a.isEqual(n, 4, "four pages() calls");
    a.isEqual(TestMachine.pagesLogField(0, 1), rwPage, "rw start page");
    a.isEqual(TestMachine.pagesLogField(0, 2), 1, "rw pages");
    a.isEqual(TestMachine.pagesLogField(0, 3), 2, "rw access = Write");
    a.isEqual(TestMachine.pagesLogField(1, 1), heapPage, "heap start page");
    a.isEqual(TestMachine.pagesLogField(1, 2), 2, "heap pages");
    a.isEqual(TestMachine.pagesLogField(1, 3), 2, "heap access = Write");
    a.isEqual(TestMachine.pagesLogField(2, 1), stackPage, "stack start page");
    a.isEqual(TestMachine.pagesLogField(2, 2), stackPages, "stack pages");
    a.isEqual(TestMachine.pagesLogField(2, 3), 2, "stack access = Write");
    a.isEqual(TestMachine.pagesLogField(3, 1), argsPage, "args start page");
    a.isEqual(TestMachine.pagesLogField(3, 2), 1, "args pages (5 bytes → 1 page)");
    a.isEqual(TestMachine.pagesLogField(3, 3), 1, "args access = Read");

    a.isEqual(TestMachine.pokeLogLength(), 2, "two poke() calls");
    a.isEqual(TestMachine.pokeLogField(0, 1), 0x0002_0000, "poke 0 dest = rw start");
    a.isEqual(TestMachine.pokeLogField(0, 2), 4, "poke 0 length");
    a.isEqual(TestMachine.pokeLogField(1, 1), 0xfeff_0000, "poke 1 dest = args start");
    a.isEqual(TestMachine.pokeLogField(1, 2), 5, "poke 1 length");
    return a;
  }),

  test("NestedPvm.invoke propagates reason + exit arg, register R/W roundtrip", () => {
    TestEcalli.reset();
    const a = Assert.create();
    const blob = buildSpi(BytesBlob.empty(), BytesBlob.empty(), 0, 0, BytesBlob.zero(4));
    const vm = NestedPvm.fromSpi(blob, BytesBlob.empty(), 500);

    // First invoke: mock returns Host with r8 = 21.
    TestMachine.setInvokeResult(i64(ExitReason.Host), 21);
    const r1 = vm.invoke();
    a.isEqual(r1, ExitReason.Host, "reason = Host");
    a.isEqual(vm.getExitArg(), 21, "exit arg captured");

    // Write a host-call return value into r7, then resume.
    vm.setRegister(7, 0x1234_5678);
    a.isEqual(vm.getRegister(7), 0x1234_5678, "r7 set");

    // Second invoke: mock returns Halt.
    TestMachine.setInvokeResult(i64(ExitReason.Halt), 0);
    const r2 = vm.invoke();
    a.isEqual(r2, ExitReason.Halt, "reason = Halt");

    a.isEqual(vm.expunge(), 0, "expunge OK");
    return a;
  }),

  // ─── fromSpiChecked (Result variant) ───────────────────────────────

  test("NestedPvm.fromSpiChecked returns ok on valid blob", () => {
    TestEcalli.reset();
    const a = Assert.create();
    const blob = buildSpi(BytesBlob.empty(), BytesBlob.empty(), 0, 0, BytesBlob.zero(4));
    const r = NestedPvm.fromSpiChecked(blob, BytesBlob.empty(), 100);
    a.isEqual(r.isOkay, true, "is okay");
    return a;
  }),

  test("NestedPvm.fromSpiChecked returns MalformedBlob on short header", () => {
    TestEcalli.reset();
    const a = Assert.create();
    // Header needs 11 bytes; we only supply 5.
    const blob = BytesBlob.zero(5);
    const r = NestedPvm.fromSpiChecked(blob, BytesBlob.empty(), 100);
    a.isEqual(r.isError, true, "is error");
    a.isEqual(r.error, SpiError.MalformedBlob, "error variant");
    return a;
  }),

  test("NestedPvm.fromSpiChecked returns TrailingBytes on extra data", () => {
    TestEcalli.reset();
    const a = Assert.create();
    const valid = buildSpi(BytesBlob.empty(), BytesBlob.empty(), 0, 0, BytesBlob.zero(4));
    // Append one trailing byte to an otherwise valid blob.
    const padded = BytesBlob.zero(valid.length + 1);
    padded.raw.set(valid.raw, 0);
    padded.raw[valid.length] = 0xff;
    const r = NestedPvm.fromSpiChecked(padded, BytesBlob.empty(), 100);
    a.isEqual(r.isError, true, "is error");
    a.isEqual(r.error, SpiError.TrailingBytes, "error variant");
    return a;
  }),

  test("NestedPvm.fromSpiChecked returns InvalidEntryPoint when host rejects code", () => {
    TestEcalli.reset();
    const a = Assert.create();
    TestMachine.setMachineResult(EcalliResult.HUH);
    const blob = buildSpi(BytesBlob.empty(), BytesBlob.empty(), 0, 0, BytesBlob.zero(4));
    const r = NestedPvm.fromSpiChecked(blob, BytesBlob.empty(), 100);
    a.isEqual(r.isError, true, "is error");
    a.isEqual(r.error, SpiError.InvalidEntryPoint, "error variant");
    return a;
  }),
];
