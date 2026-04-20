import { BytesBlob, blake2b256, RefineContext, Response } from "@fluffylabs/as-lan";
import { writeU32LE } from "./storage";

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
  // BytesBlob.length is i32; cast to u32 so subsequent shifts are unsigned.
  const length: u32 = u32(args.payload.length);
  writeU32LE(out.raw, 32, length);

  return Response.with(0, out);
}
