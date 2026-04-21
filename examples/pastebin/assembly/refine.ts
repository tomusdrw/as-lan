import { Bytes32, blake2b256, RefineContext, Response } from "@fluffylabs/as-lan";
import { PasteDigest } from "./storage";

/**
 * Refine phase: Blake2b-256 the raw payload, emit a PasteDigest (hash ‖ length).
 *
 * Payload shape: raw blob bytes. No tag byte, no envelope — pastebin has a
 * single operation and the entire payload is the blob to be pastebinned.
 */
export function refine(ptr: u32, len: u32): u64 {
  const ctx = RefineContext.create();
  const args = ctx.parseArgs(ptr, len);

  const hash = blake2b256(args.payload.raw);
  const digest = PasteDigest.create(Bytes32.wrapUnchecked(hash), u32(args.payload.length));

  return Response.with(0, digest.encode());
}
