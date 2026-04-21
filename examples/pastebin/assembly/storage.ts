import { Bytes32, BytesBlob, Decoder, Encoder, panic } from "@fluffylabs/as-lan";
import { KEY_CLEANUP_CURSOR, KEY_RECENT_HEAD, PREFIX_EXPIRY, PREFIX_PASTE, PREFIX_RECENT } from "./constants";

/** Build a 4-byte little-endian u32 as a BytesBlob (storage-key suffix helper). */
function u32LE(value: u32): BytesBlob {
  const e = Encoder.create(4);
  e.u32(value);
  return e.finish();
}

/** Concatenate two BytesBlobs into a new one (prefix + suffix for storage keys). */
function concatBytes(a: BytesBlob, b: BytesBlob): BytesBlob {
  const e = Encoder.create(a.length + b.length);
  e.bytesFixLen(a);
  e.bytesFixLen(b);
  return e.finish();
}

export function pasteKey(hash: Bytes32): BytesBlob {
  return concatBytes(PREFIX_PASTE, hash.bytes);
}

export function recentKey(idx: u32): BytesBlob {
  return concatBytes(PREFIX_RECENT, u32LE(idx));
}

export function expiryKey(slot: u32): BytesBlob {
  return concatBytes(PREFIX_EXPIRY, u32LE(slot));
}

export function recentHeadKey(): BytesBlob {
  return KEY_RECENT_HEAD;
}
export function cleanupCursorKey(): BytesBlob {
  return KEY_CLEANUP_CURSOR;
}

// ─── PasteEntry codec ──────────────────────────────────────────────────────
// Fixed 8-byte layout: (submission_slot: u32 LE, length: u32 LE).

export class PasteEntry {
  static create(slot: u32, length: u32): PasteEntry {
    return new PasteEntry(slot, length);
  }
  private constructor(
    public readonly slot: u32,
    public readonly length: u32,
  ) {}

  encode(): BytesBlob {
    const e = Encoder.create(8);
    e.u32(this.slot);
    e.u32(this.length);
    return e.finish();
  }

  static decodeOrPanic(raw: Uint8Array): PasteEntry {
    // Explicit check + panic() — `assert()` is stripped under `noAssert: true`
    // in the release target (asconfig.json), which would turn a wrong-length
    // buffer into a silent zero-filled PasteEntry instead of a trap.
    if (raw.length !== 8) panic("PasteEntry: expected 8 bytes");
    const d = Decoder.fromBlob(raw);
    const slot = d.u32();
    const length = d.u32();
    return new PasteEntry(slot, length);
  }
}
