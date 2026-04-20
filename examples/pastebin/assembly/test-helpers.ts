import { Assert } from "@fluffylabs/as-lan/test";

/** Assert that two byte buffers are equal (length + each element). */
export function assertBytes(assert: Assert, actual: Uint8Array, expected: Uint8Array, msg: string): void {
  assert.isEqual(actual.length, expected.length, `${msg}.length`);
  if (actual.length !== expected.length) return;
  for (let i = 0; i < actual.length; i += 1) {
    assert.isEqual(actual[i], expected[i], `${msg}[${i}]`);
  }
}
