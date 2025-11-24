// extern function should be available in some context object.
export declare function gas(): i64;

export declare function lookup(
  service: u32,
  hash_ptr: u32,
  out_ptr: u32,
  out_len: u32,
): u32;
