/**
 * Typed fetcher for the accumulate context.
 *
 * Available fetch kinds: 0 (constants), 1 (entropy), 14-15 (accumulate items).
 * Codecs are created lazily — only when first accessed.
 */

import { Bytes32Codec } from "../../core/codec/bytes32";
import { Decoder } from "../../core/codec/decode";
import { panic } from "../../core/panic";
import { Result } from "../../core/result";
import { FetchKind } from "../../ecalli/general/fetch";
import { FetchBuffer, FetchError, fetchAndDecode, fetchRaw } from "../fetcher";
import { EntropyHash } from "../types";
import { ProtocolConstants, ProtocolConstantsCodec } from "../work-package";
import { AccumulateItem, AccumulateItemCodec, OperandCodec, PendingTransferCodec, WorkExecResultCodec } from "./item";

export class AccumulateFetcher {
  static create(bufSize: u32 = 1024): AccumulateFetcher {
    return new AccumulateFetcher(bufSize);
  }

  private readonly fb: FetchBuffer;

  // Lazy codec fields
  private _protocolConstants: ProtocolConstantsCodec | null = null;
  private _bytes32: Bytes32Codec | null = null;
  private _accumulateItem: AccumulateItemCodec | null = null;

  private constructor(bufSize: u32) {
    this.fb = FetchBuffer.create(bufSize);
  }

  private get protocolConstants(): ProtocolConstantsCodec {
    if (this._protocolConstants === null) this._protocolConstants = ProtocolConstantsCodec.create();
    return this._protocolConstants!;
  }

  private get bytes32(): Bytes32Codec {
    if (this._bytes32 === null) this._bytes32 = Bytes32Codec.create();
    return this._bytes32!;
  }

  private get accumulateItem(): AccumulateItemCodec {
    if (this._accumulateItem === null) {
      const workExecResult = WorkExecResultCodec.create();
      const operand = OperandCodec.create(workExecResult);
      const pendingTransfer = PendingTransferCodec.create();
      this._accumulateItem = AccumulateItemCodec.create(operand, pendingTransfer);
    }
    return this._accumulateItem!;
  }

  /** Protocol constants (kind 0). */
  constants(): Result<ProtocolConstants, FetchError> {
    return fetchAndDecode<ProtocolConstants>(this.fb, this.protocolConstants, FetchKind.Constants);
  }

  /** Entropy pool (kind 1). In accumulate context this is η'₀ (posterior entropy, 32 bytes). */
  entropy(): Result<EntropyHash, FetchError> {
    return fetchAndDecode<EntropyHash>(this.fb, this.bytes32, FetchKind.Entropy);
  }

  /**
   * Fetch and decode all accumulate items (operands and transfers) at once
   * via `fetch(kind=14)`.
   *
   * The wire format is a varlen sequence: `varU64(count)` followed by
   * `count` concatenated tagged items.
   */
  allTransfersAndOperands(): Result<StaticArray<AccumulateItem>, FetchError> {
    const raw = fetchRaw(this.fb, FetchKind.AllTransfersAndOperands);
    if (raw.isError) return Result.err<StaticArray<AccumulateItem>, FetchError>(raw.error);
    const d = Decoder.fromBlob(raw.okay!);
    const r = d.sequenceVarLen<AccumulateItem>(this.accumulateItem);
    if (r.isError || !d.isFinished()) panic("allTransfersAndOperands: host returned malformed data");
    return Result.ok<StaticArray<AccumulateItem>, FetchError>(r.okay!);
  }

  /** Fetch a single accumulate item by index, decoded as a typed union (kind 15). */
  oneTransferOrOperand(index: u32): Result<AccumulateItem, FetchError> {
    return fetchAndDecode<AccumulateItem>(this.fb, this.accumulateItem, FetchKind.OneTransferOrOperand, index);
  }
}
