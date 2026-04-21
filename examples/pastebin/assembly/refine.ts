import { Bytes32, blake2b256, Encoder, RefineContext, Response } from "@fluffylabs/as-lan";
import { REFINE_OUTPUT_LEN } from "./constants";

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

  // Operand okBlob = 32-byte hash ‖ 4-byte length (u32 LE). See REFINE_OUTPUT_LEN.
  const e = Encoder.create(REFINE_OUTPUT_LEN);
  e.bytes32(Bytes32.wrapUnchecked(hash));
  e.u32(u32(args.payload.length));

  return Response.with(0, e.finish());
}
