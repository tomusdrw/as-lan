export { accumulate } from "./accumulate";

import { is_authorized } from "./authorize";
import { refine as refine_ } from "./refine";

export function refine(ptr: u32, len: u32): u64 {
  if (len === 2) {
    return is_authorized(ptr, len);
  }
  return refine_(ptr, len);
}
