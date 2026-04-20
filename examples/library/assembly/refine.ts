import { AccumulateContext, RefineContext } from "@fluffylabs/as-lan";

export function refine(_ptr: u32, _len: u32): u64 {
  const ctx = RefineContext.create();
  return ctx.respond(0);
}

export function accumulate(_ptr: u32, _len: u32): u64 {
  const ctx = AccumulateContext.create();
  return ctx.respond(0);
}
