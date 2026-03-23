/**
 * Accumulate invocation context.
 *
 * Holds all codec instances and provides convenience methods for
 * parsing arguments, encoding responses, and creating the fetcher.
 */

import { Bytes32, BytesBlob } from "../../core/bytes";
import { Bytes32Codec } from "../../core/codec/bytes32";
import { Decoder } from "../../core/codec/decode";
import { Encoder } from "../../core/codec/encode";
import { readFromMemory } from "../../core/mem";
import { ptrAndLen } from "../../core/pack";
import { Result } from "../../core/result";
import {
  AccumulateArgs,
  AccumulateArgsCodec,
  OptionalCodeHashCodec,
  ParseError,
  Response,
  ResponseCodec,
} from "../service";
import { ProtocolConstantsCodec } from "../work-package";
import { AccumulateItemCodec, OperandCodec, PendingTransferCodec, WorkExecResultCodec } from "./item";

export class AccumulateContext {
  static create(): AccumulateContext {
    return new AccumulateContext();
  }

  // Codecs
  readonly bytes32: Bytes32Codec;
  readonly protocolConstants: ProtocolConstantsCodec;
  readonly workExecResult: WorkExecResultCodec;
  readonly operand: OperandCodec;
  readonly pendingTransfer: PendingTransferCodec;
  readonly accumulateItem: AccumulateItemCodec;
  readonly accumulateArgs: AccumulateArgsCodec;
  readonly response: ResponseCodec;
  readonly optionalCodeHash: OptionalCodeHashCodec;

  private constructor() {
    const bytes32 = Bytes32Codec.create();
    const workExecResult = WorkExecResultCodec.create();
    const pendingTransfer = PendingTransferCodec.create();
    const operand = OperandCodec.create(workExecResult);

    this.bytes32 = bytes32;
    this.protocolConstants = ProtocolConstantsCodec.create();
    this.workExecResult = workExecResult;
    this.operand = operand;
    this.pendingTransfer = pendingTransfer;
    this.accumulateItem = AccumulateItemCodec.create(operand, pendingTransfer);
    this.accumulateArgs = AccumulateArgsCodec.create();
    this.response = ResponseCodec.create();
    this.optionalCodeHash = OptionalCodeHashCodec.create(bytes32);
  }

  /** Parse raw accumulate arguments from (ptr, len). */
  parseArgs(ptr: u32, len: u32): Result<AccumulateArgs, ParseError> {
    const decoder = Decoder.fromBlob(readFromMemory(ptr, len));
    const r = this.accumulateArgs.decode(decoder);
    if (r.isError) return Result.err<AccumulateArgs, ParseError>(ParseError.DecodeError);
    if (!decoder.isFinished()) return Result.err<AccumulateArgs, ParseError>(ParseError.TrailingBytes);
    return Result.ok<AccumulateArgs, ParseError>(r.okay!);
  }

  /** Encode a response and return it as a ptrAndLen-packed u64. */
  respond(ecalliResult: i64, data: Uint8Array | null = null): u64 {
    const bytes = data === null ? BytesBlob.empty() : BytesBlob.wrap(data);
    const enc = Encoder.create(8 + 1 + bytes.raw.length);
    this.response.encode(Response.create(ecalliResult, bytes), enc);
    return ptrAndLen(enc.finish());
  }

  /** Encode an optional CodeHash and return it as a ptrAndLen-packed u64. */
  yieldHash(hash: Bytes32 | null): u64 {
    const enc = Encoder.create(33);
    this.optionalCodeHash.encode(hash, enc);
    return ptrAndLen(enc.finish());
  }
}
