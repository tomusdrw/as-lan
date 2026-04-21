import {
  AccumulateContext,
  AccumulatePreimages,
  Bytes32,
  BytesBlob,
  CurrentServiceData,
  Decoder,
  Encoder,
  panic,
  Response,
} from "@fluffylabs/as-lan";
import { CLEANUP_SLOTS_PER_CALL, RECENT_ENTRY_LEN, RECENT_N, REFINE_OUTPUT_LEN, TTL_SLOTS } from "./constants";
import { cleanupCursorKey, expiryKey, PasteDigest, PasteEntry, pasteKey, recentHeadKey, recentKey } from "./storage";

/** Build a 4-byte little-endian u32 BytesBlob (counter / cursor value). */
function u32Blob(value: u32): BytesBlob {
  const e = Encoder.create(4);
  e.u32(value);
  return e.finish();
}

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
  const prevLen: u32 = existing.isSome ? u32(existing.val!.length) : 0;
  const e = Encoder.create(prevLen + 32);
  if (existing.isSome) e.bytesFixLen(BytesBlob.wrap(existing.val!));
  e.bytes32(hash);
  storage.write(bucketKey, e.finish());
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
    // Soft-skip malformed refine output (would otherwise trip PasteDigest.decodeOrPanic).
    if (okBlob.length < REFINE_OUTPUT_LEN) continue;
    const digest = PasteDigest.decodeOrPanic(okBlob);
    const hash = digest.hash;
    const length = digest.length;

    // Idempotency: skip if this paste is already known.
    const existing = storage.read(pasteKey(hash).raw);
    if (!existing.isSome) {
      const solicitRes = preimages.solicit(hash, length);
      if (!solicitRes.isError) {
        // Metadata.
        storage.write(pasteKey(hash).raw, PasteEntry.create(currentSlot, length).encode());

        // Ring buffer of recent pastes: write hash ‖ slot at recent:<head % N>,
        // then bump the head counter.
        const headBlob = storage.read(recentHeadKey().raw);
        const head: u32 = headBlob.isSome ? Decoder.fromBlob(headBlob.val!).u32() : 0;
        const entryEnc = Encoder.create(RECENT_ENTRY_LEN);
        entryEnc.bytes32(hash);
        entryEnc.u32(currentSlot);
        storage.write(recentKey(head % RECENT_N).raw, entryEnc.finish());
        storage.write(recentHeadKey().raw, u32Blob(head + 1));

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
    cursor = Decoder.fromBlob(raw).u32();
  }

  // Walk at most CLEANUP_SLOTS_PER_CALL slots forward, bounded by currentSlot.
  const limit: u32 = cursor + CLEANUP_SLOTS_PER_CALL;
  const target: u32 = limit < currentSlot ? limit : currentSlot;

  for (let s: u32 = cursor + 1; s <= target; s += 1) {
    const bucketKeyBytes = expiryKey(s).raw;
    const bucket = storage.read(bucketKeyBytes);
    if (!bucket.isSome) continue;

    // Bucket holds a packed list of 32-byte hashes — decode with the standard codec.
    const d = Decoder.fromBlob(bucket.val!);
    const bucketLen = u32(bucket.val!.length);
    while (u32(d.bytesRead()) + 32 <= bucketLen) {
      const hash = d.bytes32();

      const entryBlob = storage.read(pasteKey(hash).raw);
      if (entryBlob.isSome) {
        const entry = PasteEntry.decodeOrPanic(entryBlob.val!);
        // forget result ignored: the paste metadata is being deleted either way.
        preimages.forget(hash, entry.length);
        storage.write(pasteKey(hash).raw, BytesBlob.empty());
      }
    }
    // Delete the bucket itself.
    storage.write(bucketKeyBytes, BytesBlob.empty());
  }

  // Persist new cursor only if it advanced.
  if (target > cursor) {
    storage.write(cleanupCursorKey().raw, u32Blob(target));
  }
}
