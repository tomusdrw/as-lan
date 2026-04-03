/**
 * Typed fetcher for the accumulate context.
 *
 * Available fetch kinds: 0 (constants), 1 (entropy), 14-15 (accumulate items).
 * Codecs are created lazily — only when first accessed.
 */

import { Bytes32Codec } from "../../core/codec/bytes32";
import { Decoder } from "../../core/codec/decode";
import { panic } from "../../core/panic";
import { FetchKind } from "../../ecalli/general/fetch";
import { FetchBuffer, fetchAndDecodeOptional, fetchRawOrPanic } from "../fetcher";
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
  constants(): ProtocolConstants {
    const raw = fetchRawOrPanic(this.fb, FetchKind.Constants);
    const d = Decoder.fromBlob(raw);
    const r = this.protocolConstants.decode(d);
    if (r.isError || !d.isFinished()) panic("constants: host returned malformed data");
    return r.okay!;
  }

  /** Entropy pool (kind 1). In accumulate context this is η'₀ (posterior entropy, 32 bytes). */
  entropy(): EntropyHash {
    const raw = fetchRawOrPanic(this.fb, FetchKind.Entropy);
    const d = Decoder.fromBlob(raw);
    const r = this.bytes32.decode(d);
    if (r.isError || !d.isFinished()) panic("entropy: host returned malformed data");
    return r.okay!;
  }

  /**
   * Fetch and decode all accumulate items (operands and transfers) at once
   * via `fetch(kind=14)`.
   *
   * The wire format is a varlen sequence: `varU64(count)` followed by
   * `count` concatenated tagged items.
   */
  allTransfersAndOperands(): StaticArray<AccumulateItem> {
    const raw = fetchRawOrPanic(this.fb, FetchKind.AllTransfersAndOperands);
    const d = Decoder.fromBlob(raw);
    const r = d.sequenceVarLen<AccumulateItem>(this.accumulateItem);
    if (r.isError || !d.isFinished()) panic("allTransfersAndOperands: host returned malformed data");
    return r.okay!;
  }

  /** Fetch a single accumulate item by index (kind 15). Returns null if index is out of bounds. */
  oneTransferOrOperand(index: u32): AccumulateItem | null {
    return fetchAndDecodeOptional<AccumulateItem>(this.fb, this.accumulateItem, FetchKind.OneTransferOrOperand, index);
  }
}
