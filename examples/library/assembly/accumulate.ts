import { AccumulateContext, Bytes32 } from "@fluffylabs/as-lan";

export function accumulate(_ptr: u32, _len: u32): u64 {
  const ctx = AccumulateContext.create();
  return ctx.yieldHash(Bytes32.zero());
}
