import { AuthorizeContext, Response } from "@fluffylabs/as-lan";

/**
 * is_authorized: accept any payload unconditionally. Pastebin is open to all.
 */
export function is_authorized(ptr: u32, len: u32): u64 {
  const ctx = AuthorizeContext.create();
  // Validates input size (panics if < 2 bytes). CoreIndex is unused — pastebin accepts all cores.
  ctx.parseCoreIndex(ptr, len);
  return Response.with(0);
}
