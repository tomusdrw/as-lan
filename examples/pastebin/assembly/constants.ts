import { BytesBlob } from "@fluffylabs/as-lan";

export const TTL_SLOTS: u32 = 1000;
export const RECENT_N: u32 = 32;
export const CLEANUP_SLOTS_PER_CALL: u32 = 8;

// Storage key prefixes. Values are pre-encoded ASCII BytesBlobs to avoid
// pulling in AssemblyScript's full UTF-8 machinery. Each key is built by
// concatenating the prefix with the variable suffix (hash / slot / etc).
export const PREFIX_PASTE: BytesBlob = BytesBlob.encodeAscii("paste:");
export const PREFIX_RECENT: BytesBlob = BytesBlob.encodeAscii("recent:");
export const PREFIX_EXPIRY: BytesBlob = BytesBlob.encodeAscii("expiry:");
export const KEY_RECENT_HEAD: BytesBlob = BytesBlob.encodeAscii("recent_head");
export const KEY_CLEANUP_CURSOR: BytesBlob = BytesBlob.encodeAscii("meta:cleanup_cursor");
