import { Bytes32, BytesBlob, panic } from "@fluffylabs/as-lan";
import {
  KEY_CLEANUP_CURSOR,
  KEY_RECENT_HEAD,
  PREFIX_EXPIRY,
  PREFIX_PASTE,
  PREFIX_RECENT,
} from "./constants";

function concatBytes(a: BytesBlob, b: BytesBlob): BytesBlob {
  const out = BytesBlob.zero(a.length + b.length);
  for (let i = 0; i < a.length; i += 1) out.raw[i] = a.raw[i];
  for (let i = 0; i < b.length; i += 1) out.raw[a.length + i] = b.raw[i];
  return out;
}

function u32LE(value: u32): BytesBlob {
  const out = BytesBlob.zero(4);
  out.raw[0] = u8(value & 0xff);
  out.raw[1] = u8((value >> 8) & 0xff);
  out.raw[2] = u8((value >> 16) & 0xff);
  out.raw[3] = u8((value >> 24) & 0xff);
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
    out.raw[0] = u8(this.slot & 0xff);
    out.raw[1] = u8((this.slot >> 8) & 0xff);
    out.raw[2] = u8((this.slot >> 16) & 0xff);
    out.raw[3] = u8((this.slot >> 24) & 0xff);
    out.raw[4] = u8(this.length & 0xff);
    out.raw[5] = u8((this.length >> 8) & 0xff);
    out.raw[6] = u8((this.length >> 16) & 0xff);
    out.raw[7] = u8((this.length >> 24) & 0xff);
    return out;
  }

  static decodeOrPanic(raw: Uint8Array): PasteEntry {
    // Explicit check + panic() — `assert()` is stripped under `noAssert: true`
    // in the release target (asconfig.json), which would turn a wrong-length
    // buffer into a silent zero-filled PasteEntry instead of a trap.
    if (raw.length != 8) panic("PasteEntry: expected 8 bytes");
    const slot = u32(raw[0]) | (u32(raw[1]) << 8) | (u32(raw[2]) << 16) | (u32(raw[3]) << 24);
    const length = u32(raw[4]) | (u32(raw[5]) << 8) | (u32(raw[6]) << 16) | (u32(raw[7]) << 24);
    return new PasteEntry(slot, length);
  }
}
