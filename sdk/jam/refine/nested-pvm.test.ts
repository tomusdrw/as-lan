import { BytesBlob } from "../../core/bytes";
import { Encoder } from "../../core/codec/encode";
import { TestEcalli, TestMachine } from "../../test/test-ecalli";
import { Assert, Test, test } from "../../test/utils";
import { NestedPvm } from "./nested-pvm";

/** Build an SPI blob with the given regions. */
function buildSpi(
  roBytes: Uint8Array,
  rwBytes: Uint8Array,
  heapPages: u16,
  stackSize: u32,
  codeBytes: Uint8Array,
): BytesBlob {
  const e = Encoder.create(64);
  // Header: u24 roLength, u24 rwLength, u16 heapPages, u24 stackSize.
  writeU24(e, u32(roBytes.length));
  writeU24(e, u32(rwBytes.length));
  e.u16(heapPages);
  writeU24(e, stackSize);
  // Regions.
  for (let i = 0; i < roBytes.length; i++) e.u8(roBytes[i]);
  for (let i = 0; i < rwBytes.length; i++) e.u8(rwBytes[i]);
  e.u32(u32(codeBytes.length));
  for (let i = 0; i < codeBytes.length; i++) e.u8(codeBytes[i]);
  return e.finish();
}

function writeU24(e: Encoder, v: u32): void {
  e.u8(u8(v & 0xff));
  e.u8(u8((v >> 8) & 0xff));
  e.u8(u8((v >> 16) & 0xff));
}

export const TESTS: Test[] = [
  test("NestedPvm.fromSpi decodes header and slices", () => {
    TestEcalli.reset();
    const a = Assert.create();
    const ro = new Uint8Array(3); ro[0] = 1; ro[1] = 2; ro[2] = 3;
    const rw = new Uint8Array(2); rw[0] = 9; rw[1] = 8;
    const code = new Uint8Array(4); code[0] = 0xAA; code[3] = 0xBB;
    const blob = buildSpi(ro, rw, 2, 4096, code);
    const args = BytesBlob.empty();
    const vm = NestedPvm.fromSpi(blob, args, 1_000_000);
    a.isEqual(vm.getRegister(0), 0xFFFF_0000, "r0 initial");
    a.isEqual(vm.getRegister(1), 0xFEFE_0000, "r1 = stack segment end");
    a.isEqual(vm.getRegister(7), 0xFEFF_0000, "r7 = args segment start");
    a.isEqual(vm.getRegister(8), 0, "r8 = args length");
    a.isEqual(vm.remainingGas(), 1_000_000, "gas");
    return a;
  }),

  test("NestedPvm.fromSpi allocates RO pages then pokes RO bytes", () => {
    TestEcalli.reset();
    const a = Assert.create();
    const ro = new Uint8Array(10); for (let i = 0; i < 10; i++) ro[i] = u8(i + 1);
    const rw = new Uint8Array(0);
    const code = new Uint8Array(4);
    const blob = buildSpi(ro, rw, 0, 0, code);
    NestedPvm.fromSpi(blob, BytesBlob.empty(), 1_000);

    a.isEqual(TestMachine.pagesLogLength(), 1, "exactly one pages() call");
    const roStartPage: u32 = 0x0001_0000 / 4096; // = 16
    a.isEqual(TestMachine.pagesLogField(0, 1), roStartPage, "RO start page");
    a.isEqual(TestMachine.pagesLogField(0, 2), 1, "RO page count (10 bytes → 1 page)");
    a.isEqual(TestMachine.pagesLogField(0, 3), 1, "RO access = Read");

    a.isEqual(TestMachine.pokeLogLength(), 1, "exactly one poke() call");
    a.isEqual(TestMachine.pokeLogField(0, 1), 0x0001_0000, "poke dest = RO start");
    a.isEqual(TestMachine.pokeLogField(0, 2), 10, "poke length = ro length");
    const copied = new Uint8Array(10);
    TestMachine.pokeLogData(0, copied);
    for (let i = 0; i < 10; i++) a.isEqual(copied[i], u8(i + 1), "byte " + i.toString());
    return a;
  }),

  test("NestedPvm.fromSpi configures RW, heap, stack, args regions", () => {
    TestEcalli.reset();
    const a = Assert.create();
    const ro = new Uint8Array(0);
    const rw = new Uint8Array(4); rw[0] = 0xAA; rw[3] = 0xBB;
    const code = new Uint8Array(4);
    const args = new Uint8Array(5); args[0] = 0xCC;
    const stackSize: u32 = 2 * 4096 + 1; // rounds up to 3 pages.
    const heapPages: u16 = 2;
    const blob = buildSpi(ro, rw, heapPages, stackSize, code);
    NestedPvm.fromSpi(blob, BytesBlob.wrap(args), 1_000);

    const rwPage: u32 = 0x0002_0000 / 4096;         // 32
    const heapPage: u32 = rwPage + 1;
    const stackPages: u32 = 3;
    const stackPage: u32 = (0xFEFE_0000 - stackPages * 4096) / 4096;
    const argsPage: u32 = 0xFEFF_0000 / 4096;
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
    a.isEqual(TestMachine.pokeLogField(1, 1), 0xFEFF_0000, "poke 1 dest = args start");
    a.isEqual(TestMachine.pokeLogField(1, 2), 5, "poke 1 length");
    return a;
  }),
];
