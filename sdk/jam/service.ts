import { BytesBlob } from "../core/bytes";
import { Bytes32Codec } from "../core/codec/bytes32";
import { DecodeError, Decoder, TryDecode } from "../core/codec/decode";
import { Encoder, TryEncode } from "../core/codec/encode";
import { ptrAndLen } from "../core/pack";
import { Result } from "../core/result";
import { CodeHash, CoreIndex, ServiceId, Slot, WorkPackageHash } from "./types";

// ─── Entry-point discriminant ─────────────────────────────────────────

/**
 * Distinguish a refine invocation from an `is_authorized` invocation by
 * input length.
 *
 * JAM self-authorizing services share a single entry function between
 * `is_authorized` (exactly 2 bytes — a u16 core index; GP Appendix B)
 * and `refine` (10+ bytes — a full RefineArgs encoding). This helper
 * centralizes that discriminant for the typical `index.ts` dispatch:
 *
 * ```typescript
 * export function refine(ptr: u32, len: u32): u64 {
 *   if (isRefineArgs(len)) return refine_(ptr, len);
 *   return is_authorized(ptr, len);
 * }
 * ```
 */
export function isRefineArgs(len: u32): bool {
  return len !== 2;
}

// ─── RefineArgs ───────────────────────────────────────────────────────

export class RefineArgs {
  static create(
    coreIndex: CoreIndex,
    itemIndex: u32,
    serviceId: ServiceId,
    payload: BytesBlob,
    workPackageHash: WorkPackageHash,
  ): RefineArgs {
    return new RefineArgs(coreIndex, itemIndex, serviceId, payload, workPackageHash);
  }

  private constructor(
    public coreIndex: CoreIndex,
    public itemIndex: u32,
    public serviceId: ServiceId,
    public payload: BytesBlob,
    public workPackageHash: WorkPackageHash,
  ) {}
}

export class RefineArgsCodec implements TryDecode<RefineArgs>, TryEncode<RefineArgs> {
  static create(): RefineArgsCodec {
    return new RefineArgsCodec();
  }
  private constructor() {}

  decode(d: Decoder): Result<RefineArgs, DecodeError> {
    const coreIndex = d.varU32();
    if (coreIndex > 0xffff) return Result.err<RefineArgs, DecodeError>(DecodeError.InvalidData);
    const itemIndex = d.varU32();
    const serviceId = d.varU32();
    const payload = d.bytesVarLen();
    const workPackageHash = d.bytes32();
    if (d.isError) return Result.err<RefineArgs, DecodeError>(DecodeError.MissingBytes);
    return Result.ok<RefineArgs, DecodeError>(
      RefineArgs.create(u16(coreIndex), itemIndex, serviceId, payload, workPackageHash),
    );
  }

  encode(v: RefineArgs, e: Encoder): void {
    e.varU64(u64(v.coreIndex));
    e.varU64(u64(v.itemIndex));
    e.varU64(u64(v.serviceId));
    e.bytesVarLen(v.payload);
    e.bytes32(v.workPackageHash);
  }
}

// ─── AccumulateArgs ───────────────────────────────────────────────────

export class AccumulateArgs {
  static create(slot: Slot, serviceId: ServiceId, argsLength: u32): AccumulateArgs {
    return new AccumulateArgs(slot, serviceId, argsLength);
  }

  private constructor(
    public slot: Slot,
    public serviceId: ServiceId,
    public argsLength: u32,
  ) {}
}

export class AccumulateArgsCodec implements TryDecode<AccumulateArgs>, TryEncode<AccumulateArgs> {
  static create(): AccumulateArgsCodec {
    return new AccumulateArgsCodec();
  }
  private constructor() {}

  decode(d: Decoder): Result<AccumulateArgs, DecodeError> {
    const slot = d.varU32();
    const serviceId = d.varU32();
    const argsLength = d.varU32();
    if (d.isError) return Result.err<AccumulateArgs, DecodeError>(DecodeError.MissingBytes);
    return Result.ok<AccumulateArgs, DecodeError>(AccumulateArgs.create(slot, serviceId, argsLength));
  }

  encode(v: AccumulateArgs, e: Encoder): void {
    e.varU64(u64(v.slot));
    e.varU64(u64(v.serviceId));
    e.varU64(u64(v.argsLength));
  }
}

// ─── Response ─────────────────────────────────────────────────────────

/**
 * Response from a refine or accumulate entry point.
 *
 * Encoding: result(u64 LE) + data(bytesVarLen)
 */
export class Response {
  static create(result: i64, data: BytesBlob): Response {
    return new Response(result, data);
  }

  private constructor(
    /** Ecalli result code. */
    public result: i64,
    /** Output data (may be empty). */
    public data: BytesBlob,
  ) {}

  /**
   * Encode a response and return it as a ptrAndLen-packed u64.
   * This is the primary way dispatch functions return results.
   */
  static with(ecalliResult: i64, data: BytesBlob | null = null): u64 {
    const bytes = data === null ? BytesBlob.empty() : data;
    const enc = Encoder.create(8 + 1 + bytes.raw.length);
    enc.u64(u64(ecalliResult));
    enc.bytesVarLen(bytes);
    return ptrAndLen(enc.finishRaw());
  }
}

export class ResponseCodec implements TryDecode<Response>, TryEncode<Response> {
  static create(): ResponseCodec {
    return new ResponseCodec();
  }
  private constructor() {}

  decode(d: Decoder): Result<Response, DecodeError> {
    const result = i64(d.u64());
    const data = d.bytesVarLen();
    if (d.isError) return Result.err<Response, DecodeError>(DecodeError.MissingBytes);
    return Result.ok<Response, DecodeError>(Response.create(result, data));
  }

  encode(v: Response, e: Encoder): void {
    e.u64(u64(v.result));
    e.bytesVarLen(v.data);
  }
}

// ─── OptionalCodeHash ─────────────────────────────────────────────────

export class OptionalCodeHashCodec implements TryDecode<CodeHash | null>, TryEncode<CodeHash | null> {
  static create(bytes32: Bytes32Codec): OptionalCodeHashCodec {
    return new OptionalCodeHashCodec(bytes32);
  }
  private constructor(private readonly bytes32: Bytes32Codec) {}

  decode(d: Decoder): Result<CodeHash | null, DecodeError> {
    return d.optional<CodeHash>(this.bytes32);
  }

  encode(v: CodeHash | null, e: Encoder): void {
    e.optional<CodeHash>(this.bytes32, v);
  }
}
