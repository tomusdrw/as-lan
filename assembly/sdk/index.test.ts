import { BytesBlob } from "../core/bytes";
import { Assert, Test, test } from "../test";
import { accumulate_ext, refine_ext } from "./index";

function leU32(v: u32): Uint8Array {
  const out = new Uint8Array(4);
  out[0] = u8(v & 0xff);
  out[1] = u8((v >> 8) & 0xff);
  out[2] = u8((v >> 16) & 0xff);
  out[3] = u8((v >> 24) & 0xff);
  return out;
}

function pushBlob(out: u8[], blob: Uint8Array): void {
  out.push(u8(blob.length));
  for (let i = 0; i < blob.length; i += 1) {
    out.push(blob[i]);
  }
}

function pushBytes(out: u8[], bytes: Uint8Array): void {
  for (let i = 0; i < bytes.length; i += 1) {
    out.push(bytes[i]);
  }
}

function toBytes(out: u8[]): Uint8Array {
  const v = new Uint8Array(out.length);
  for (let i = 0; i < out.length; i += 1) {
    v[i] = out[i];
  }
  return v;
}

function fromHex(hex: string): Uint8Array {
  return BytesBlob.parseBlob(hex).okay!.raw;
}

function assertBytes(assert: Assert, actual: Uint8Array, expected: Uint8Array, msg: string): void {
  assert.isEqual(actual.length, expected.length, `${msg}.length`);
  if (actual.length !== expected.length) {
    return;
  }
  for (let i = 0; i < actual.length; i += 1) {
    assert.isEqual(actual[i], expected[i], `${msg}[${i}]`);
  }
}

function buildPackageInfoEmpty(): u8[] {
  const out: u8[] = [];
  const zeros32 = fromHex("0x0000000000000000000000000000000000000000000000000000000000000000");

  // package hash
  pushBytes(out, zeros32);
  // RefineContext fields: anchor, stateRoot, beefyRoot, lookupAnchor
  pushBytes(out, zeros32);
  pushBytes(out, zeros32);
  pushBytes(out, zeros32);
  pushBytes(out, zeros32);
  // lookupAnchorSlot
  pushBytes(out, leU32(0));
  // prerequisites: empty vec
  out.push(0);

  return out;
}

export const TESTS: Test[] = [
  test("refine_ext echoes payload", () => {
    const out: u8[] = [];
    pushBytes(out, leU32(42)); // serviceId
    pushBlob(out, fromHex("0xdeadbeef")); // payload
    pushBytes(out, toBytes(buildPackageInfoEmpty())); // packageInfo
    out.push(0); // extrinsics vec len

    const result = refine_ext(toBytes(out));
    const assert = new Assert();
    assertBytes(assert, result, fromHex("0xdeadbeef"), "refine output");
    return assert;
  }),
  test("accumulate_ext encodes some hash", () => {
    const out: u8[] = [];
    const workPackage = fromHex("0x1111111111111111111111111111111111111111111111111111111111111111");
    const payloadHash = fromHex("0x2222222222222222222222222222222222222222222222222222222222222222");

    pushBytes(out, leU32(7)); // slot
    pushBytes(out, leU32(9)); // service id
    out.push(1); // results vec len

    pushBytes(out, workPackage); // workPackage
    pushBlob(out, fromHex("0x")); // authOutput
    pushBytes(out, payloadHash); // payloadHash
    out.push(0); // WorkExecResultKind::OK
    pushBlob(out, fromHex("0xab")); // ok blob

    const result = accumulate_ext(toBytes(out));
    const assert = new Assert();
    assert.isEqual(result.length, 33);
    assert.isEqual(result[0], 1);
    assertBytes(assert, result.subarray(1), workPackage, "encoded hash");
    return assert;
  }),
];
