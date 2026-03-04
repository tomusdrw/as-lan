// extern function should be available in some context object.
export declare function gas(): i64;

export declare function lookup(
  service: u32,
  hash_ptr: u32,
  out_ptr: u32,
  out_len: u32,
): u32;

// JIP-1: Debug message host call (index 100)
// level: 0=fatal, 1=warning, 2=important, 3=helpful, 4=pedantic
// target_ptr/target_len: optional category string (both 0 = null)
// message_ptr/message_len: debug message string
export declare function log(
  level: u32,
  target_ptr: u32,
  target_len: u32,
  message_ptr: u32,
  message_len: u32,
): u32;
