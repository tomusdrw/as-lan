/**
 * Low-level fetch primitives wrapping the raw `fetch` ecalli (Ω_Y, GP Appendix B.5).
 *
 * These standalone functions handle buffer management, auto-expansion, and
 * error detection. Context-specific fetcher classes (RefineFetcher,
 * AccumulateFetcher, etc.) build on these primitives.
 *
 * Functions come in two flavours:
 * - **Must-exist** (`fetchRawOrPanic`, `fetchBlobOrPanic`, `fetchAndDecode`):
 *   Panic when the host returns NONE. Use for data that is always present
 *   in the current context (e.g. constants, work package).
 * - **Optional** (`fetchRaw`, `fetchBlob`, `fetchAndDecodeOptional`):
 *   Return `Optional.none` when the host returns NONE. Use for indexed data
 *   where the index may be out of bounds (e.g. oneWorkItem, myImport).
 *
 * ## Future direction: offset-based partial fetching
 *
 * The raw `fetch(dest, offset, length, kind, ...)` ecalli supports an
 * `offset` parameter (r8) that reads a slice of the data starting at
 * the given byte position. Currently all fetch methods pass `offset=0`
 * and retrieve the full blob, which is then decoded in WASM memory.
 *
 * A future optimization could expose `offset`/`length` so callers can
 * request only the bytes they need — e.g. reading just the `serviceId`
 * of a WorkItem without fetching its entire payload.
 */

import { BytesBlob } from "../core/bytes";
import { Decoder, TryDecode } from "../core/codec/decode";
import { panic } from "../core/panic";
import { Optional } from "../core/result";
import { FetchKind, fetch } from "../ecalli/general/fetch";

/**
 * Reusable fetch buffer. Callers pass this to fetch functions so that
 * consecutive fetches can reuse the same allocation.
 */
export class FetchBuffer {
  static create(size: u32 = 1024): FetchBuffer {
    return new FetchBuffer(size);
  }

  buf: Uint8Array;

  private constructor(size: u32) {
    this.buf = new Uint8Array(size);
  }
}

/**
 * Fetch raw bytes for the given kind/params.
 *
 * Returns a *copy* of the data (safe to hold across calls), or
 * `Optional.none` when the host indicates the data is unavailable.
 * If the buffer is too small, it is expanded to the exact
 * required size and the fetch is retried.
 */
export function fetchRaw(fb: FetchBuffer, kind: FetchKind, param1: u32 = 0, param2: u32 = 0): Optional<Uint8Array> {
  let result = fetch(u32(fb.buf.dataStart), 0, fb.buf.length, kind, param1, param2);
  if (result < 0) return Optional.none<Uint8Array>();

  // Auto-expand: the host told us the total length exceeds our buffer.
  if (result > i64(fb.buf.length)) {
    fb.buf = new Uint8Array(u32(result));
    result = fetch(u32(fb.buf.dataStart), 0, fb.buf.length, kind, param1, param2);
    if (result < 0) return Optional.none<Uint8Array>();
  }

  const len = u32(min(i64(fb.buf.length), result));
  return Optional.some<Uint8Array>(fb.buf.slice(0, len));
}

/** Fetch raw bytes, panicking if the data is unavailable. */
export function fetchRawOrPanic(fb: FetchBuffer, kind: FetchKind, param1: u32 = 0, param2: u32 = 0): Uint8Array {
  const raw = fetchRaw(fb, kind, param1, param2);
  if (!raw.isSome) panic("fetchRawOrPanic: host returned NONE for expected data");
  return raw.val!;
}

/** Fetch and wrap as BytesBlob, or `Optional.none` if unavailable. */
export function fetchBlob(fb: FetchBuffer, kind: FetchKind, param1: u32 = 0, param2: u32 = 0): Optional<BytesBlob> {
  const raw = fetchRaw(fb, kind, param1, param2);
  if (!raw.isSome) return Optional.none<BytesBlob>();
  return Optional.some<BytesBlob>(BytesBlob.wrap(raw.val!));
}

/** Fetch and wrap as BytesBlob, panicking if unavailable. */
export function fetchBlobOrPanic(fb: FetchBuffer, kind: FetchKind, param1: u32 = 0, param2: u32 = 0): BytesBlob {
  return BytesBlob.wrap(fetchRawOrPanic(fb, kind, param1, param2));
}

/**
 * Fetch, decode using the given codec, and verify no trailing bytes.
 * Panics if the data is unavailable or if decoding fails.
 */
export function fetchAndDecode<T>(
  fb: FetchBuffer,
  codec: TryDecode<T>,
  kind: FetchKind,
  param1: u32 = 0,
  param2: u32 = 0,
): T {
  const raw = fetchRawOrPanic(fb, kind, param1, param2);
  const d = Decoder.fromBlob(raw);
  const r = codec.decode(d);
  if (r.isError || !d.isFinished()) panic("fetchAndDecode: host returned malformed data");
  return r.okay!;
}

/**
 * Fetch and decode, returning `Optional.none` when the data is unavailable.
 * Panics if the data is present but decoding fails.
 */
export function fetchAndDecodeOptional<T>(
  fb: FetchBuffer,
  codec: TryDecode<T>,
  kind: FetchKind,
  param1: u32 = 0,
  param2: u32 = 0,
): Optional<T> {
  const raw = fetchRaw(fb, kind, param1, param2);
  if (!raw.isSome) return Optional.none<T>();
  const d = Decoder.fromBlob(raw.val!);
  const r = codec.decode(d);
  if (r.isError || !d.isFinished()) panic("fetchAndDecodeOptional: host returned malformed data");
  return Optional.some<T>(r.okay!);
}
