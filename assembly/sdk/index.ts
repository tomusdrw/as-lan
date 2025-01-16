// The entry file of your WebAssembly module.

import { PackageInfo } from "../jam/types";

declare function gas(): i64;

declare function lookup(service: u32, hash_ptr: u32, out_ptr: u32, out_len: u32): u32;

export function is_authorized(): u32 {
  return 0;
}
export function accumulate(_p: PackageInfo): u32 {
  return 0;
}
export function refine(): u32 {
  const limit = gas();
  let a = 1;
  let b = 1;

  for (let i = 1; i < limit; i += 1) {
    const t = b;
    b = a;
    a = a + t;
  }

  return a;
}

export function on_transfer(): u32 {
  return 0;
}

export function add(a: i32, b: i32): i32 {
  return a + b + <i32>gas();
}
