import { BytesBlob } from "../../core/bytes";
import { Encoder } from "../../core/codec/encode";
import { TestEcalli } from "../../test/test-ecalli";
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
];
