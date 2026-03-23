/**
 * High-level fetcher for the refine context.
 *
 * Available fetch kinds: 0 (constants), 1 (entropy), 2 (authorizer trace),
 * 3-6 (extrinsics and imports), 7-13 (work package data).
 */

import { BytesBlob } from "../../core/bytes";
import { Result } from "../../core/result";
import { FetchKind } from "../../ecalli/general/fetch";
import { FetchError } from "../fetcher";
import { EntropyHash } from "../types";
import { WorkPackageContext } from "../work-package-context";
import { WorkPackageFetcher } from "../work-package-fetcher";

export class RefineFetcher extends WorkPackageFetcher {
  static create(ctx: WorkPackageContext, bufSize: u32 = 1024): RefineFetcher {
    return new RefineFetcher(ctx, bufSize);
  }

  private constructor(ctx: WorkPackageContext, bufSize: u32 = 1024) {
    super(ctx, bufSize);
  }

  /** Entropy pool (kind 1). In refine context this is H₀ (anchor header hash, 32 bytes). */
  entropy(): Result<EntropyHash, FetchError> {
    return this.fetchAndDecode(this.wpCtx.bytes32, FetchKind.Entropy);
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
