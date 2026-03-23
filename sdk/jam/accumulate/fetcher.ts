/**
 * High-level fetcher for the accumulate context.
 *
 * Available fetch kinds: 0 (constants), 1 (entropy), 14-15 (accumulate items).
 */

import { Decoder } from "../../core/codec/decode";
import { Result } from "../../core/result";
import { FetchKind } from "../../ecalli/general/fetch";
import { FetchError, Fetcher } from "../fetcher";
import { EntropyHash } from "../types";
import { ProtocolConstants } from "../work-package";
import { AccumulateContext } from "./context";
import { AccumulateItem } from "./item";

export class AccumulateFetcher extends Fetcher {
  static create(ctx: AccumulateContext, bufSize: u32 = 1024): AccumulateFetcher {
    return new AccumulateFetcher(ctx, bufSize);
  }

  private constructor(
    private readonly ctx: AccumulateContext,
    bufSize: u32 = 1024,
  ) {
    super(bufSize);
  }

  /** Protocol constants (kind 0). */
  constants(): Result<ProtocolConstants, FetchError> {
    return this.fetchAndDecode(this.ctx.protocolConstants, FetchKind.Constants);
  }

  /** Entropy pool (kind 1). In accumulate context this is η'₀ (posterior entropy, 32 bytes). */
  entropy(): Result<EntropyHash, FetchError> {
    return this.fetchAndDecode(this.ctx.bytes32, FetchKind.Entropy);
  }

  /**
   * Fetch and decode all accumulate items (operands and transfers) at once
   * via `fetch(kind=14)`.
   *
   * The wire format is a varlen sequence: `varU64(count)` followed by
   * `count` concatenated tagged items.
   */
  allTransfersAndOperands(): Result<StaticArray<AccumulateItem>, FetchError> {
    const raw = this.fetchRaw(FetchKind.AllTransfersAndOperands);
    if (raw.isError) return Result.err<StaticArray<AccumulateItem>, FetchError>(raw.error);
    const d = Decoder.fromBlob(raw.okay!);
    const r = d.sequenceVarLen<AccumulateItem>(this.ctx.accumulateItem);
    if (r.isError || !d.isFinished())
      return Result.err<StaticArray<AccumulateItem>, FetchError>(FetchError.DecodeError);
    return Result.ok<StaticArray<AccumulateItem>, FetchError>(r.okay!);
  }

  /** Fetch a single accumulate item by index, decoded as a typed union (kind 15). */
  oneTransferOrOperand(index: u32): Result<AccumulateItem, FetchError> {
    return this.fetchAndDecode<AccumulateItem>(this.ctx.accumulateItem, FetchKind.OneTransferOrOperand, index);
  }
}
