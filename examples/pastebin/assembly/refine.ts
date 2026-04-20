import { BytesBlob, RefineContext, Response } from "@fluffylabs/as-lan";
import { blake2b256 } from "./crypto/blake2b";

/**
 * Refine phase: Blake2b-256 the raw payload, emit `hash ‖ length_LE`.
 *
 * Payload shape: raw blob bytes. No tag byte, no envelope — pastebin has a
 * single operation and the entire payload is the blob to be pastebinned.
 */
export function refine(ptr: u32, len: u32): u64 {
  const ctx = RefineContext.create();
  const args = ctx.parseArgs(ptr, len);

  const hash = blake2b256(args.payload.raw);

  // Operand okBlob = 32-byte hash ‖ 4-byte length (u32 LE).
  const out = BytesBlob.zero(36);
  for (let i = 0; i < 32; i += 1) out.raw[i] = hash[i];
  const length: u32 = u32(args.payload.length);
  out.raw[32] = u8(length & 0xff);
  out.raw[33] = u8((length >> 8) & 0xff);
  out.raw[34] = u8((length >> 16) & 0xff);
  out.raw[35] = u8((length >> 24) & 0xff);

  return Response.with(0, out);
}
