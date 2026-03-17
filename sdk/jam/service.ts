import { BytesBlob } from "../core/bytes";
import { Decoder } from "../core/codec/decode";
import { Encoder } from "../core/codec/encode";
import { readFromMemory } from "../core/mem";
import { ptrAndLen } from "../core/pack";
import { Optional, Result } from "../core/result";
import { CodeHash, CoreIndex, ServiceId, Slot, WorkPackageHash } from "./types";

/** Errors returned when parsing ABI arguments for refine or accumulate. */
export enum ParseError {
  CoreIndexOutOfRange = 0,
  ItemIndexOutOfRange,
  ServiceIdOutOfRange,
  SlotOutOfRange,
  ArgsLengthOutOfRange,
  DecodeError,
  TrailingBytes,
}

export class RefineArgs {
  constructor(
    public coreIndex: CoreIndex,
    public itemIndex: u32,
    public serviceId: ServiceId,
    public payload: BytesBlob,
    public workPackageHash: WorkPackageHash,
  ) {}

  /** Parse raw refine arguments from (ptr, len). Returns a Result. */
  static parse(ptr: u32, len: u32): Result<RefineArgs, ParseError> {
    const inData = readFromMemory(ptr, len);
    const decoder = Decoder.fromBlob(inData);
    const coreIndex = decoder.varU64();
    if (coreIndex > 0xffff) {
      return Result.err<RefineArgs, ParseError>(ParseError.CoreIndexOutOfRange);
    }
    const itemIndex = decoder.varU64();
    if (itemIndex > 0xffff_ffff) {
      return Result.err<RefineArgs, ParseError>(ParseError.ItemIndexOutOfRange);
    }
    const serviceId = decoder.varU64();
    if (serviceId > 0xffff_ffff) {
      return Result.err<RefineArgs, ParseError>(ParseError.ServiceIdOutOfRange);
    }
    const payload = decoder.bytesVarLen();
    const workPackageHash = decoder.bytes32();
    if (decoder.isError) {
      return Result.err<RefineArgs, ParseError>(ParseError.DecodeError);
    }
    if (!decoder.isFinished()) {
      return Result.err<RefineArgs, ParseError>(ParseError.TrailingBytes);
    }
    return Result.ok<RefineArgs, ParseError>(
      new RefineArgs(u16(coreIndex), u32(itemIndex), u32(serviceId), payload, workPackageHash),
    );
  }

  /** Encode refine arguments into an Encoder. */
  encode(e: Encoder): void {
    e.varU64(u64(this.coreIndex));
    e.varU64(u64(this.itemIndex));
    e.varU64(u64(this.serviceId));
    e.bytesVarLen(this.payload);
    e.bytesFixLen(this.workPackageHash.raw);
  }
}

export class AccumulateArgs {
  constructor(
    public slot: Slot,
    public serviceId: ServiceId,
    public argsLength: u32,
  ) {}

  /** Parse raw accumulate arguments from (ptr, len). Returns a Result. */
  static parse(ptr: u32, len: u32): Result<AccumulateArgs, ParseError> {
    const inData = readFromMemory(ptr, len);
    const decoder = Decoder.fromBlob(inData);
    const slot = decoder.varU64();
    if (slot > 0xffff_ffff) {
      return Result.err<AccumulateArgs, ParseError>(ParseError.SlotOutOfRange);
    }
    const serviceId = decoder.varU64();
    if (serviceId > 0xffff_ffff) {
      return Result.err<AccumulateArgs, ParseError>(ParseError.ServiceIdOutOfRange);
    }
    const argsLength = decoder.varU64();
    if (argsLength > 0xffff_ffff) {
      return Result.err<AccumulateArgs, ParseError>(ParseError.ArgsLengthOutOfRange);
    }
    if (decoder.isError) {
      return Result.err<AccumulateArgs, ParseError>(ParseError.DecodeError);
    }
    if (!decoder.isFinished()) {
      return Result.err<AccumulateArgs, ParseError>(ParseError.TrailingBytes);
    }
    return Result.ok<AccumulateArgs, ParseError>(new AccumulateArgs(u32(slot), u32(serviceId), u32(argsLength)));
  }

  /** Encode accumulate arguments into an Encoder. */
  encode(e: Encoder): void {
    e.varU64(u64(this.slot));
    e.varU64(u64(this.serviceId));
    e.varU64(u64(this.argsLength));
  }
}

/**
 * Response from a refine or accumulate entry point.
 *
 * Encoding: result(u64 LE) + data(bytesVarLen)
 */
export class Response {
  constructor(
    /** Ecalli result code. */
    public result: i64,
    /** Output data (may be empty). */
    public data: BytesBlob,
  ) {}

  /** Decode a response from raw bytes. */
  static decode(raw: Uint8Array): Response {
    const d = Decoder.fromBlob(raw);
    const result = i64(d.u64());
    const data = d.bytesVarLen();
    return new Response(result, data);
  }

  /**
   * Encode a response and return it as a ptrAndLen-packed u64.
   * This is the primary way dispatch functions return results.
   */
  static with(ecalliResult: i64, data: Uint8Array | null = null): u64 {
    const enc = Encoder.create();
    enc.u64(u64(ecalliResult));
    if (data !== null) {
      enc.bytesVarLen(BytesBlob.wrap(data));
    } else {
      enc.varU64(0);
    }
    return ptrAndLen(enc.finish());
  }

  /** Encode response into an Encoder. */
  encode(e: Encoder): void {
    e.u64(u64(this.result));
    e.bytesVarLen(this.data);
  }
}

// Result encoders

/** Encode an Optional<CodeHash> as bytes and pack into u64. */
export function encodeOptionalCodeHash(hash: Optional<CodeHash>): BytesBlob {
  if (!hash.isSome) {
    return BytesBlob.wrap(new Uint8Array(1));
  }

  const out = new Uint8Array(33);
  out[0] = 1;
  out.set(hash.val!.raw, 1);
  return BytesBlob.wrap(out);
}
