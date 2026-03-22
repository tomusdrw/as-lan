/**
 * High-level fetcher for the refine context.
 *
 * Available fetch kinds: 0 (constants), 1 (entropy), 2 (authorizer trace),
 * 3-6 (extrinsics and imports), 7-13 (work package data).
 */

import { Bytes32, BytesBlob } from "../../core/bytes";
import { Decoder } from "../../core/codec/decode";
import { Result } from "../../core/result";
import { FetchKind } from "../../ecalli/general/fetch";
import { FetchError } from "../fetcher";
import { WorkPackageFetcher } from "../work-package-fetcher";

export class RefineFetcher extends WorkPackageFetcher {
  static create(bufSize: u32 = 1024): RefineFetcher {
    return new RefineFetcher(bufSize);
  }

  private constructor(bufSize: u32 = 1024) {
    super(bufSize);
  }

  /** Entropy pool (kind 1). In refine context this is H₀ (anchor header hash, 32 bytes). */
  entropy(): Result<Bytes32, FetchError> {
    const raw = this.fetchRaw(FetchKind.Entropy);
    if (raw.isError) return Result.err<Bytes32, FetchError>(raw.error);
    const d = Decoder.fromBlob(raw.okay!);
    const hash = d.bytes32();
    if (d.isError) return Result.err<Bytes32, FetchError>(FetchError.DecodeError);
    return Result.ok<Bytes32, FetchError>(hash);
  }

  /** Authorizer trace data (kind 2). */
  authorizerTrace(): Result<BytesBlob, FetchError> {
    return this.fetchBlob(FetchKind.AuthorizerTrace);
  }

  /** Extrinsic data for the current work item (kind 4). */
  myExtrinsic(index: u32): Result<BytesBlob, FetchError> {
    return this.fetchBlob(FetchKind.MyExtrinsics, index);
  }

  /** Extrinsic data for another work item (kind 3). */
  otherExtrinsic(workItem: u32, index: u32): Result<BytesBlob, FetchError> {
    return this.fetchBlob(FetchKind.OtherWorkItemExtrinsics, workItem, index);
  }

  /** Import segment for the current work item (kind 6). */
  myImport(index: u32): Result<BytesBlob, FetchError> {
    return this.fetchBlob(FetchKind.MyImports, index);
  }

  /** Import segment for another work item (kind 5). */
  otherImport(workItem: u32, index: u32): Result<BytesBlob, FetchError> {
    return this.fetchBlob(FetchKind.OtherWorkItemImports, workItem, index);
  }
}
