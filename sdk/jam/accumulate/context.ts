/**
 * Accumulate invocation context.
 *
 * Provides convenience methods for parsing arguments, encoding responses,
 * and accessing accumulate-item codecs. Codecs are created lazily — only
 * when first accessed.
 */

import { Bytes32, BytesBlob } from "../../core/bytes";
import { Bytes32Codec } from "../../core/codec/bytes32";
import { Decoder } from "../../core/codec/decode";
import { Encoder } from "../../core/codec/encode";
import { readFromMemory } from "../../core/mem";
import { ptrAndLen } from "../../core/pack";
import { panic } from "../../core/panic";
import { checkpoint as checkpoint_, yield_result } from "../../ecalli/accumulate";
import { AccumulateArgs, AccumulateArgsCodec, OptionalCodeHashCodec, Response, ResponseCodec } from "../service";
import { AccumulateItemCodec, OperandCodec, PendingTransferCodec, WorkExecResultCodec } from "./item";

export class AccumulateContext {
  static create(): AccumulateContext {
    return new AccumulateContext();
  }

  // Lazy codec fields
  private _accumulateArgs: AccumulateArgsCodec | null = null;
  private _response: ResponseCodec | null = null;
  private _optionalCodeHash: OptionalCodeHashCodec | null = null;
  private _workExecResult: WorkExecResultCodec | null = null;
  private _operand: OperandCodec | null = null;
  private _pendingTransfer: PendingTransferCodec | null = null;
  private _accumulateItem: AccumulateItemCodec | null = null;

  private constructor() {}

  get accumulateArgs(): AccumulateArgsCodec {
    if (this._accumulateArgs === null) this._accumulateArgs = AccumulateArgsCodec.create();
    return this._accumulateArgs!;
  }

  get response(): ResponseCodec {
    if (this._response === null) this._response = ResponseCodec.create();
    return this._response!;
  }

  get optionalCodeHash(): OptionalCodeHashCodec {
    if (this._optionalCodeHash === null) this._optionalCodeHash = OptionalCodeHashCodec.create(Bytes32Codec.create());
    return this._optionalCodeHash!;
  }

  get workExecResult(): WorkExecResultCodec {
    if (this._workExecResult === null) this._workExecResult = WorkExecResultCodec.create();
    return this._workExecResult!;
  }

  get operand(): OperandCodec {
    if (this._operand === null) this._operand = OperandCodec.create(this.workExecResult);
    return this._operand!;
  }

  get pendingTransfer(): PendingTransferCodec {
    if (this._pendingTransfer === null) this._pendingTransfer = PendingTransferCodec.create();
    return this._pendingTransfer!;
  }

  get accumulateItem(): AccumulateItemCodec {
    if (this._accumulateItem === null)
      this._accumulateItem = AccumulateItemCodec.create(this.operand, this.pendingTransfer);
    return this._accumulateItem!;
  }

  /**
   * Create a state checkpoint, committing all changes up to this point (ecalli 17).
   *
   * @returns remaining gas after the checkpoint.
   */
  checkpoint(): i64 {
    return checkpoint_();
  }

  /**
   * Provide the accumulation result hash (ecalli 25).
   */
  yieldResult(hash: Bytes32): void {
    yield_result(hash.ptr());
  }

  /** Parse raw accumulate arguments from (ptr, len). Panics on invalid data. */
  parseArgs(ptr: u32, len: u32): AccumulateArgs {
    const decoder = Decoder.fromBlob(readFromMemory(ptr, len));
    const r = this.accumulateArgs.decode(decoder);
    if (r.isError) panic("Failed to decode AccumulateArgs");
    if (!decoder.isFinished()) panic("Trailing bytes after AccumulateArgs");
    return r.okay!;
  }

  /** Encode a response and return it as a ptrAndLen-packed u64. */
  respond(ecalliResult: i64, data: Uint8Array | null = null): u64 {
    const bytes = data === null ? BytesBlob.empty() : BytesBlob.wrap(data);
    const enc = Encoder.create(8 + 1 + bytes.raw.length);
    this.response.encode(Response.create(ecalliResult, bytes), enc);
    return ptrAndLen(enc.finishRaw());
  }

  /** Encode an optional CodeHash and return it as a ptrAndLen-packed u64. */
  yieldHash(hash: Bytes32 | null): u64 {
    const enc = Encoder.create(33);
    this.optionalCodeHash.encode(hash, enc);
    return ptrAndLen(enc.finishRaw());
  }
}
