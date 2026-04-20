import { Bytes32, BytesBlob, panic } from "@fluffylabs/as-lan";
import {
  KEY_CLEANUP_CURSOR,
  KEY_RECENT_HEAD,
  PREFIX_EXPIRY,
  PREFIX_PASTE,
  PREFIX_RECENT,
} from "./constants";

@inline export function writeU32LE(dst: Uint8Array, offset: i32, value: u32): void {
  dst[offset] = u8(value);
  dst[offset + 1] = u8(value >> 8);
  dst[offset + 2] = u8(value >> 16);
  dst[offset + 3] = u8(value >> 24);
}

@inline export function readU32LE(src: Uint8Array, offset: i32): u32 {
  return u32(src[offset])
    | (u32(src[offset + 1]) << 8)
    | (u32(src[offset + 2]) << 16)
    | (u32(src[offset + 3]) << 24);
}

function concatBytes(a: BytesBlob, b: BytesBlob): BytesBlob {
  const out = BytesBlob.zero(a.length + b.length);
  for (let i = 0; i < a.length; i += 1) out.raw[i] = a.raw[i];
  for (let i = 0; i < b.length; i += 1) out.raw[a.length + i] = b.raw[i];
  return out;
}

function u32LE(value: u32): BytesBlob {
  const out = BytesBlob.zero(4);
  writeU32LE(out.raw, 0, value);
  return out;
}

export function pasteKey(hash: Bytes32): BytesBlob {
  return concatBytes(PREFIX_PASTE, BytesBlob.wrap(hash.raw));
}

export function recentKey(idx: u32): BytesBlob {
  return concatBytes(PREFIX_RECENT, u32LE(idx));
}

export function expiryKey(slot: u32): BytesBlob {
  return concatBytes(PREFIX_EXPIRY, u32LE(slot));
}

export function recentHeadKey(): BytesBlob { return KEY_RECENT_HEAD; }
export function cleanupCursorKey(): BytesBlob { return KEY_CLEANUP_CURSOR; }

// ─── PasteEntry codec ──────────────────────────────────────────────────────
// Fixed 8-byte layout: (submission_slot: u32 LE, length: u32 LE).

export class PasteEntry {
  static create(slot: u32, length: u32): PasteEntry {
    return new PasteEntry(slot, length);
  }
  private constructor(public readonly slot: u32, public readonly length: u32) {}

  encode(): BytesBlob {
    const out = BytesBlob.zero(8);
    writeU32LE(out.raw, 0, this.slot);
    writeU32LE(out.raw, 4, this.length);
    return out;
  }

  static decodeOrPanic(raw: Uint8Array): PasteEntry {
    // Explicit check + panic() — `assert()` is stripped under `noAssert: true`
    // in the release target (asconfig.json), which would turn a wrong-length
    // buffer into a silent zero-filled PasteEntry instead of a trap.
    if (raw.length != 8) panic("PasteEntry: expected 8 bytes");
    const slot = readU32LE(raw, 0);
    const length = readU32LE(raw, 4);
    return new PasteEntry(slot, length);
  }
}
