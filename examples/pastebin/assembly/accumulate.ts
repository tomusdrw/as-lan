import {
  AccumulateContext,
  AccumulatePreimages,
  Bytes32,
  CurrentServiceData,
  panic,
  Response,
} from "@fluffylabs/as-lan";
import { CLEANUP_SLOTS_PER_CALL, RECENT_N, TTL_SLOTS } from "./constants";
import {
  cleanupCursorKey,
  expiryKey,
  PasteEntry,
  pasteKey,
  readU32LE,
  recentHeadKey,
  recentKey,
  writeU32LE,
} from "./storage";

/**
 * Append a 32-byte hash to an `expiry:<slot>` bucket (read-modify-write).
 *
 * If `storage.write` fails (e.g. FULL), the paste won't be scheduled for
 * expiry and will persist indefinitely after the metadata + ring writes
 * above have already succeeded. Acceptable for v1 — a production-hardened
 * service would want to either roll back the prior writes or surface the
 * failure in the accumulate Response.
 */
function appendHashToExpiryBucket(storage: CurrentServiceData, bucketKey: Uint8Array, hash: Bytes32): void {
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

/**
 * Reclaim expired pastes. Walks at most CLEANUP_SLOTS_PER_CALL expiry buckets
 * forward from the persisted cursor, bounded by `currentSlot`. For each paste
 * hash in a swept bucket: forget the preimage (ignoring failure — the record
 * is being deleted either way) and delete the metadata entry. The bucket key
 * itself is also deleted. The cursor advances monotonically and is persisted
 * only when it moves forward.
 */
function runCleanup(storage: CurrentServiceData, preimages: AccumulatePreimages, currentSlot: u32): void {
  // Read current cursor (u32 LE). Absent on the first sweep → start at 0.
  // A wrong-length blob is host-contract corruption (the only writer is this
  // function, which always writes exactly 4 bytes) — panic, matching
  // PasteEntry.decodeOrPanic's posture on malformed internal records.
  const cursorBlob = storage.read(cleanupCursorKey().raw);
  let cursor: u32 = 0;
  if (cursorBlob.isSome) {
    const raw = cursorBlob.val!;
    if (raw.length !== 4) panic("cleanup cursor: expected 4 bytes");
    cursor = readU32LE(raw, 0);
  }

  // Walk at most CLEANUP_SLOTS_PER_CALL slots forward, bounded by currentSlot.
  const limit: u32 = cursor + CLEANUP_SLOTS_PER_CALL;
  const target: u32 = limit < currentSlot ? limit : currentSlot;

  for (let s: u32 = cursor + 1; s <= target; s += 1) {
    const bucketKeyBytes = expiryKey(s).raw;
    const bucket = storage.read(bucketKeyBytes);
    if (!bucket.isSome) continue;

    // Bucket holds a packed list of 32-byte hashes.
    const raw = bucket.val!;
    const bucketLen = u32(raw.length);
    let off: u32 = 0;
    while (off + 32 <= bucketLen) {
      const hashBytes = new Uint8Array(32);
      hashBytes.set(raw.subarray(i32(off), i32(off + 32)), 0);
      const hash = Bytes32.wrapUnchecked(hashBytes);

      const entryBlob = storage.read(pasteKey(hash).raw);
      if (entryBlob.isSome) {
        const entry = PasteEntry.decodeOrPanic(entryBlob.val!);
        // forget result ignored: the paste metadata is being deleted either way.
        preimages.forget(hash, entry.length);
        storage.write(pasteKey(hash).raw, new Uint8Array(0));
      }
      off += 32;
    }
    // Delete the bucket itself.
    storage.write(bucketKeyBytes, new Uint8Array(0));
  }

  // Persist new cursor only if it advanced.
  if (target > cursor) {
    const out = new Uint8Array(4);
    writeU32LE(out, 0, target);
    storage.write(cleanupCursorKey().raw, out);
  }
}
