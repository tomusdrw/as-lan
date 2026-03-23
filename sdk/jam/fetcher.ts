/**
 * Low-level fetch primitives wrapping the raw `fetch` ecalli (Ω_Y, GP Appendix B.5).
 *
 * These standalone functions handle buffer management, auto-expansion, and
 * error detection. Context-specific fetcher classes (RefineFetcher,
 * AccumulateFetcher, etc.) build on these primitives.
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
import { Result } from "../core/result";
import { FetchKind, fetch } from "../ecalli/general/fetch";

/**
 * Error codes returned by fetcher methods.
 *
 * The fetch ecalli (Ω_Y) only ever returns NONE or a positive data length
 * (GP Appendix B.5). Other ecalli sentinels (WHAT, WHO, OOB, etc.) are
 * not applicable to fetch. Memory write failures cause a PVM panic and
 * never reach SDK code.
 */
export enum FetchError {
  /**
   * Data not available.
   *
   * Returned when the fetch kind/index has no data in the current context:
   * e.g. index out of bounds for oneWorkItem(), or kind not applicable.
   *
   * GP: v = ∅ → φ'₇ = NONE
   */
  None = 0,
  /** Failed to decode the returned bytes into the expected type. */
  DecodeError,
}

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
 * FetchError.None when the host indicates the data is unavailable.
 * If the buffer is too small, it is expanded to the exact
 * required size and the fetch is retried.
 */
export function fetchRaw(fb: FetchBuffer, kind: FetchKind, param1: u32 = 0, param2: u32 = 0): Result<Uint8Array, FetchError> {
  let result = fetch(u32(fb.buf.dataStart), 0, fb.buf.length, kind, param1, param2);
  if (result < 0) return Result.err<Uint8Array, FetchError>(FetchError.None);

  // Auto-expand: the host told us the total length exceeds our buffer.
  if (result > i64(fb.buf.length)) {
    fb.buf = new Uint8Array(u32(result));
    result = fetch(u32(fb.buf.dataStart), 0, fb.buf.length, kind, param1, param2);
    if (result < 0) return Result.err<Uint8Array, FetchError>(FetchError.None);
  }

  const len = u32(min(i64(fb.buf.length), result));
  return Result.ok<Uint8Array, FetchError>(fb.buf.slice(0, len));
}

/** Fetch and wrap as BytesBlob. */
export function fetchBlob(fb: FetchBuffer, kind: FetchKind, param1: u32 = 0, param2: u32 = 0): Result<BytesBlob, FetchError> {
  const r = fetchRaw(fb, kind, param1, param2);
  if (r.isError) return Result.err<BytesBlob, FetchError>(r.error);
  return Result.ok<BytesBlob, FetchError>(BytesBlob.wrap(r.okay!));
}

/** Fetch raw bytes, decode using the given codec, and verify no trailing bytes. */
export function fetchAndDecode<T>(fb: FetchBuffer, codec: TryDecode<T>, kind: FetchKind, param1: u32 = 0, param2: u32 = 0): Result<T, FetchError> {
  const raw = fetchRaw(fb, kind, param1, param2);
  if (raw.isError) return Result.err<T, FetchError>(raw.error);
  const d = Decoder.fromBlob(raw.okay!);
  const r = codec.decode(d);
  if (r.isError || !d.isFinished()) return Result.err<T, FetchError>(FetchError.DecodeError);
  return Result.ok<T, FetchError>(r.okay!);
}
