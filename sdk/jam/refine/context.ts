/**
 * Refine invocation context.
 *
 * Provides convenience methods for parsing arguments and encoding responses.
 */

import { BytesBlob } from "../../core/bytes";
import { Decoder } from "../../core/codec/decode";
import { Encoder } from "../../core/codec/encode";
import { readFromMemory } from "../../core/mem";
import { ptrAndLen } from "../../core/pack";
import { panic } from "../../core/panic";
import { ResultN } from "../../core/result";
import { EcalliResult } from "../../ecalli";
import { gas } from "../../ecalli/general/gas";
import { export_segment } from "../../ecalli/refine";
import { RefineArgs, RefineArgsCodec, Response, ResponseCodec } from "../service";
import { CurrentServiceData } from "../service-data";
import { RefineFetcher } from "./fetcher";
import { InvalidEntryPoint, Machine } from "./machine";
import { RefinePreimages } from "./preimages";

export class RefineContext {
  static create(): RefineContext {
    return new RefineContext();
  }

  readonly refineArgs: RefineArgsCodec;
  readonly response: ResponseCodec;

  private constructor() {
    this.refineArgs = RefineArgsCodec.create();
    this.response = ResponseCodec.create();
  }

  /** Return the remaining gas after this call (ecalli 0). */
  remainingGas(): i64 {
    return gas();
  }

  // ── Helper factories ────────────────────────────────────────────────

  /** Create a RefineFetcher for this context (fetch kinds 0-13). */
  fetcher(bufSize: u32 = 1024): RefineFetcher {
    return RefineFetcher.create(bufSize);
  }

  /** Create a RefinePreimages helper (lookup + historicalLookup). */
  preimages(bufSize: u32 = 1024): RefinePreimages {
    return RefinePreimages.create(bufSize);
  }

  /** Create a CurrentServiceData helper for storage read/write and account info. */
  serviceData(bufSize: u32 = 1024): CurrentServiceData {
    return CurrentServiceData.create(bufSize);
  }

  /** Create an inner PVM machine (ecalli 8). Delegates to Machine.create(). */
  machine(code: BytesBlob, entrypoint: u32): ResultN<Machine, InvalidEntryPoint> {
    return Machine.create(code, entrypoint);
  }

  /** Parse raw refine arguments from (ptr, len). Panics on invalid data. */
  parseArgs(ptr: u32, len: u32): RefineArgs {
    const decoder = Decoder.fromBlob(readFromMemory(ptr, len));
    const r = this.refineArgs.decode(decoder);
    if (r.isError) panic("Failed to decode RefineArgs");
    if (!decoder.isFinished()) panic("Trailing bytes after RefineArgs");
    return r.okay!;
  }

  /**
   * Export a segment of data (ecalli 7).
   *
   * @returns segment index on success, or ExportSegmentError.Full if limit reached.
   */
  exportSegment(segment: BytesBlob): ResultN<u32, ExportSegmentError> {
    const result = export_segment(segment.ptr(), segment.length);
    if (result === EcalliResult.FULL) {
      return ResultN.err<u32, ExportSegmentError>(ExportSegmentError.Full);
    }
    return ResultN.ok<u32, ExportSegmentError>(u32(result));
  }

  /** Encode a response and return it as a ptrAndLen-packed u64. */
  respond(ecalliResult: i64, data: Uint8Array | null = null): u64 {
    const bytes = data === null ? BytesBlob.empty() : BytesBlob.wrap(data);
    const enc = Encoder.create(8 + 1 + bytes.raw.length);
    this.response.encode(Response.create(ecalliResult, bytes), enc);
    return ptrAndLen(enc.finishRaw());
  }
}

/** Error from exportSegment(). */
export enum ExportSegmentError {
  /** Segment export limit reached (FULL sentinel). */
  Full,
}
