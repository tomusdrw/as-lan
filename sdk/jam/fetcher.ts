/**
 * Base Fetcher class with internal buffer management.
 *
 * Wraps the raw `fetch` ecalli (Ω_Y, GP Appendix B.5), handling buffer
 * allocation, auto-expansion when data exceeds the initial buffer, and
 * error detection.
 *
 * Subclasses expose context-specific typed methods (refine, accumulate, authorize).
 *
 * ## Future direction: offset-based partial fetching
 *
 * The raw `fetch(dest, offset, length, kind, ...)` ecalli supports an
 * `offset` parameter (r8) that reads a slice of the data starting at
 * the given byte position. Currently all fetcher methods pass `offset=0`
 * and retrieve the full blob, which is then decoded in WASM memory.
 *
 * For gas-sensitive code this is wasteful — e.g. reading only the
 * `serviceId` (first 4 bytes) of a WorkItem via `oneWorkItem()` still
 * fetches the entire encoded item including the payload blob.
 *
 * A future optimization could:
 * 1. Expose `offset`/`length` in `fetchRaw` so callers can request
 *    only the bytes they need.
 * 2. Add "lazy" typed wrappers that fetch fields on demand. For example
 *    a `LazyWorkItem` that only calls `fetch(kind=12, offset=0, len=4)`
 *    to read `serviceId`, and defers fetching the payload until
 *    `.payload()` is explicitly called.
 * 3. For fixed-layout types like `WorkItemInfo` (62 bytes) or
 *    `RefinementContext` (132+ bytes), a single partial fetch of exactly
 *    the struct size avoids pulling trailing data.
 *
 * This is especially relevant for `allWorkItems()` (kind 11) where
 * the varlen sequence can be large but the caller may only need to
 * inspect the first few items or specific fields.
 */

import { BytesBlob } from "../core/bytes";
import { Decoder, TryDecode } from "../core/codec/decode";
import { Result } from "../core/result";
import { FetchKind, fetch } from "../ecalli/general/fetch";
import { ProtocolConstants, protocolConstantsCodec } from "./work-package";

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

export class Fetcher {
  private buf: Uint8Array;

  protected constructor(bufSize: u32 = 1024) {
    this.buf = new Uint8Array(bufSize);
  }

  /**
   * Fetch raw bytes for the given kind/params.
   *
   * Returns a *copy* of the data (safe to hold across calls), or
   * FetchError.None when the host indicates the data is unavailable.
   * If the initial buffer is too small, it is expanded to the exact
   * required size and the fetch is retried.
   */
  protected fetchRaw(kind: FetchKind, param1: u32 = 0, param2: u32 = 0): Result<Uint8Array, FetchError> {
    let result = fetch(u32(this.buf.dataStart), 0, this.buf.length, kind, param1, param2);
    if (result < 0) return Result.err<Uint8Array, FetchError>(FetchError.None);

    // Auto-expand: the host told us the total length exceeds our buffer.
    if (result > i64(this.buf.length)) {
      this.buf = new Uint8Array(u32(result));
      result = fetch(u32(this.buf.dataStart), 0, this.buf.length, kind, param1, param2);
      if (result < 0) return Result.err<Uint8Array, FetchError>(FetchError.None);
    }

    const len = u32(min(i64(this.buf.length), result));
    return Result.ok<Uint8Array, FetchError>(this.buf.slice(0, len));
  }

  /** Helper: fetch and wrap as BytesBlob. */
  protected fetchBlob(kind: FetchKind, param1: u32 = 0, param2: u32 = 0): Result<BytesBlob, FetchError> {
    const r = this.fetchRaw(kind, param1, param2);
    if (r.isError) return Result.err<BytesBlob, FetchError>(r.error);
    return Result.ok<BytesBlob, FetchError>(BytesBlob.wrap(r.okay!));
  }

  /** Fetch raw bytes and decode using the given codec. */
  protected fetchAndDecode<T>(
    codec: TryDecode<T>,
    kind: FetchKind,
    param1: u32 = 0,
    param2: u32 = 0,
  ): Result<T, FetchError> {
    const raw = this.fetchRaw(kind, param1, param2);
    if (raw.isError) return Result.err<T, FetchError>(raw.error);
    const d = Decoder.fromBlob(raw.okay!);
    const r = codec.decode(d);
    if (r.isError) return Result.err<T, FetchError>(FetchError.DecodeError);
    return Result.ok<T, FetchError>(r.okay!);
  }

  /** Protocol constants (kind 0, always available in all contexts). */
  constants(): Result<ProtocolConstants, FetchError> {
    return this.fetchAndDecode<ProtocolConstants>(protocolConstantsCodec, FetchKind.Constants);
  }
}
