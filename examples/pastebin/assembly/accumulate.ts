import {
  AccumulateContext,
  AccumulatePreimages,
  Bytes32,
  CurrentServiceData,
  Response,
} from "@fluffylabs/as-lan";
import { RECENT_N, TTL_SLOTS } from "./constants";
import {
  expiryKey,
  pasteKey,
  PasteEntry,
  readU32LE,
  recentHeadKey,
  recentKey,
  writeU32LE,
} from "./storage";

/** Append a 32-byte hash to an `expiry:<slot>` bucket (read-modify-write). */
function appendHashToExpiryBucket(
  storage: CurrentServiceData,
  bucketKey: Uint8Array,
  hash: Bytes32,
): void {
  const existing = storage.read(bucketKey);
  const prev: Uint8Array = existing.isSome ? existing.val! : new Uint8Array(0);
  const out = new Uint8Array(prev.length + 32);
  out.set(prev, 0);
  out.set(hash.raw, prev.length);
  storage.write(bucketKey, out);
}

/**
 * Accumulate phase: for each operand whose refine succeeded, solicit the
 * preimage, record metadata, push the hash onto the ring buffer of recent
 * pastes, and schedule expiry for TTL_SLOTS slots later.
 *
 * Re-submission of an already-known hash is a no-op — the first insertion's
 * slot is preserved, which also means the expiry bucket entry is not touched
 * again (only the original submission ages out at the scheduled slot).
 *
 * Transfers are unexpected (pastebin never schedules any) and are skipped.
 */
export function accumulate(ptr: u32, len: u32): u64 {
  const ctx = AccumulateContext.create();
  const args = ctx.parseArgs(ptr, len);
  const fetcher = ctx.fetcher();
  const preimages = ctx.preimages();
  const storage = ctx.serviceData();

  const currentSlot: u32 = args.slot;

  for (let i: u32 = 0; i < args.argsLength; i += 1) {
    const itemOpt = fetcher.oneTransferOrOperand(i);
    if (!itemOpt.isSome) continue;
    const item = itemOpt.val!;
    if (!item.isOperand) continue;
    const operand = item.operand;
    if (!operand.result.isOk) continue;

    const okBlob = operand.result.okBlob;
    if (okBlob.length < 36) continue;

    // Extract (hash, length_LE) from refine output.
    const hashBytes = new Uint8Array(32);
    hashBytes.set(okBlob.raw.subarray(0, 32), 0);
    const hash = Bytes32.wrapUnchecked(hashBytes);
    const length: u32 = readU32LE(okBlob.raw, 32);

    // Idempotency: skip if this paste is already known.
    const existing = storage.read(pasteKey(hash).raw);
    if (!existing.isSome) {
      const solicitRes = preimages.solicit(hash, length);
      if (!solicitRes.isError) {
        // Metadata.
        storage.write(pasteKey(hash).raw, PasteEntry.create(currentSlot, length).encode().raw);

        // Ring buffer of recent pastes: write hash ‖ slot at recent:<head % N>,
        // then bump the head counter.
        const headBlob = storage.read(recentHeadKey().raw);
        const head: u32 = headBlob.isSome ? readU32LE(headBlob.val!, 0) : 0;
        const entry = new Uint8Array(36);
        entry.set(hash.raw, 0);
        writeU32LE(entry, 32, currentSlot);
        storage.write(recentKey(head % RECENT_N).raw, entry);

        const newHead = new Uint8Array(4);
        writeU32LE(newHead, 0, head + 1);
        storage.write(recentHeadKey().raw, newHead);

        // Expiry bucket.
        const expireAt: u32 = currentSlot + TTL_SLOTS;
        appendHashToExpiryBucket(storage, expiryKey(expireAt).raw, hash);
      }
      // On solicit failure, skip the insertion entirely.
    }
  }

  runCleanup(storage, preimages, currentSlot);

  return Response.with(0);
}

/** Reclaim expired pastes. Implemented in Task 6. */
function runCleanup(
  _storage: CurrentServiceData,
  _preimages: AccumulatePreimages,
  _currentSlot: u32,
): void {
  // Task 6 implements this. Accumulate calls it once per invocation.
}
