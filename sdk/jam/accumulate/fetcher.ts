/**
 * High-level fetcher for the accumulate context.
 *
 * Available fetch kinds: 0 (constants), 1 (entropy), 14-15 (accumulate items).
 */

import { Bytes32 } from "../../core/bytes";
import { Decoder } from "../../core/codec/decode";
import { Result } from "../../core/result";
import { FetchKind } from "../../ecalli/general/fetch";
import { FetchError, Fetcher } from "../fetcher";
import { EntropyHash } from "../types";
import { AccumulateItem, accumulateItemCodec } from "./item";

export class AccumulateFetcher extends Fetcher {
  static create(bufSize: u32 = 1024): AccumulateFetcher {
    return new AccumulateFetcher(bufSize);
  }

  private constructor(bufSize: u32 = 1024) {
    super(bufSize);
  }

  /** Entropy pool (kind 1). In accumulate context this is η'₀ (posterior entropy, 32 bytes). */
  entropy(): Result<EntropyHash, FetchError> {
    const raw = this.fetchRaw(FetchKind.Entropy);
    if (raw.isError) return Result.err<EntropyHash, FetchError>(raw.error);
    const d = Decoder.fromBlob(raw.okay!);
    const hash = d.bytes32();
    if (d.isError) return Result.err<EntropyHash, FetchError>(FetchError.DecodeError);
    return Result.ok<Bytes32, FetchError>(hash);
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
    const r = d.sequenceVarLen<AccumulateItem>(accumulateItemCodec);
    if (r.isError) return Result.err<StaticArray<AccumulateItem>, FetchError>(FetchError.DecodeError);
    return Result.ok<StaticArray<AccumulateItem>, FetchError>(r.okay!);
  }

  /** Fetch a single accumulate item by index, decoded as a typed union (kind 15). */
  oneTransferOrOperand(index: u32): Result<AccumulateItem, FetchError> {
    return this.fetchAndDecode<AccumulateItem>(accumulateItemCodec, FetchKind.OneTransferOrOperand, index);
  }
}
