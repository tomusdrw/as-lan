export { accumulate } from "./accumulate";

import { isRefineArgs } from "@fluffylabs/as-lan";
import { is_authorized } from "./authorize";
import { refine as refine_ } from "./refine";

export function refine(ptr: u32, len: u32): u64 {
  if (isRefineArgs(len)) return refine_(ptr, len);
  return is_authorized(ptr, len);
}
