import { BytesBlob } from "@fluffylabs/as-lan";
import { Assert, Test, test, unpackResult } from "@fluffylabs/as-lan/test";
import { accumulate, refine } from "./fibonacci";

function pushVarU64(out: u8[], v: u64): void {
  // Simple encoding: values < 128 fit in a single byte
  if (v < 128) {
    out.push(u8(v));
  } else {
    // For test purposes, we only need small values
    throw new Error("varU64 encoding for large values not implemented in test helper");
  }
}

function pushBytesVarLen(out: u8[], blob: Uint8Array): void {
  pushVarU64(out, u64(blob.length));
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

/** Write bytes into WASM memory and return (ptr, len). */
function writeToMemory(data: Uint8Array): u64 {
  // Allocate by creating a copy in managed memory
  const buf = new Uint8Array(data.length);
  buf.set(data);
  return (u64(buf.dataStart) << 32) | u64(buf.byteLength);
}

function callWithArgs(fn: (ptr: u32, len: u32) => u64, data: Uint8Array): Uint8Array {
  const packed = writeToMemory(data);
  const ptr = u32(packed >> 32);
  const len = u32(packed & 0xffffffff);
  const result = fn(ptr, len);
  return unpackResult(result);
}

export const TESTS: Test[] = [
  test("refine echoes payload", () => {
    const out: u8[] = [];
    const zeros32 = fromHex("0x0000000000000000000000000000000000000000000000000000000000000000");

    pushVarU64(out, 0); // coreIndex
    pushVarU64(out, 0); // itemIndex
    pushVarU64(out, 42); // serviceId
    pushBytesVarLen(out, fromHex("0xdeadbeef")); // payload
    pushBytes(out, zeros32); // workPackageHash (32 bytes)

    const result = callWithArgs(refine, toBytes(out));
    const assert = Assert.create();
    assertBytes(assert, result, fromHex("0xdeadbeef"), "refine output");
    return assert;
  }),
  test("accumulate default fib(10) = 55", () => {
    const out: u8[] = [];

    pushVarU64(out, 7); // slot
    pushVarU64(out, 9); // serviceId
    pushVarU64(out, 0); // argsLength=0 means default n=10

    const result = callWithArgs(accumulate, toBytes(out));
    const assert = Assert.create();
    // Returns Some(CodeHash) = 1 byte tag + 32 bytes
    assert.isEqual(result.length, 33, "result length");
    assert.isEqual(result[0], 1, "some tag");
    // fib(10) = 55 = 0x37, little-endian in first byte
    assert.isEqual(result[1], 55, "fib(10) low byte");
    // remaining bytes of the u64 should be 0
    for (let i = 2; i < 9; i++) {
      assert.isEqual(result[i], 0, `fib result byte[${i}]`);
    }
    return assert;
  }),
  test("accumulate fib(20) = 6765", () => {
    const out: u8[] = [];

    pushVarU64(out, 1); // slot
    pushVarU64(out, 5); // serviceId
    pushVarU64(out, 20); // argsLength=20 means n=20

    const result = callWithArgs(accumulate, toBytes(out));
    const assert = Assert.create();
    assert.isEqual(result.length, 33, "result length");
    assert.isEqual(result[0], 1, "some tag");
    // fib(20) = 6765 = 0x1A6D little-endian
    assert.isEqual(result[1], 0x6d, "fib(20) byte 0");
    assert.isEqual(result[2], 0x1a, "fib(20) byte 1");
    for (let i = 3; i < 9; i++) {
      assert.isEqual(result[i], 0, `fib result byte[${i}]`);
    }
    return assert;
  }),
  test("refine with empty payload", () => {
    const out: u8[] = [];
    const zeros32 = fromHex("0x0000000000000000000000000000000000000000000000000000000000000000");

    pushVarU64(out, 1); // coreIndex
    pushVarU64(out, 0); // itemIndex
    pushVarU64(out, 10); // serviceId
    pushBytesVarLen(out, new Uint8Array(0)); // empty payload
    pushBytes(out, zeros32); // workPackageHash

    const result = callWithArgs(refine, toBytes(out));
    const assert = Assert.create();
    assert.isEqual(result.length, 0, "empty refine output");
    return assert;
  }),
  test("accumulate fib(1) = 1", () => {
    const out: u8[] = [];

    pushVarU64(out, 0); // slot
    pushVarU64(out, 1); // serviceId
    pushVarU64(out, 1); // argsLength=1 means n=1

    const result = callWithArgs(accumulate, toBytes(out));
    const assert = Assert.create();
    assert.isEqual(result.length, 33, "result length");
    assert.isEqual(result[0], 1, "some tag");
    assert.isEqual(result[1], 1, "fib(1) = 1");
    for (let i = 2; i < 9; i++) {
      assert.isEqual(result[i], 0, `fib result byte[${i}]`);
    }
    return assert;
  }),
];
