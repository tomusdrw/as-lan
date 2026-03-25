/**
 * Typed fetcher for the refine context.
 *
 * Available fetch kinds: 0 (constants), 1 (entropy), 2 (authorizer trace),
 * 3-6 (extrinsics and imports), 7-13 (work package data).
 *
 * Composes WorkPackageFetcher for kinds 0/7-13 and adds refine-only methods.
 */

import { BytesBlob } from "../../core/bytes";
import { Result } from "../../core/result";
import { FetchKind } from "../../ecalli/general/fetch";
import { FetchError } from "../fetcher";
import { EntropyHash } from "../types";
import { AuthorizerInfo, ProtocolConstants, RefinementContext, WorkItemInfo, WorkPackage } from "../work-package";
import { WorkPackageFetcher } from "../work-package-fetcher";

export class RefineFetcher {
  static create(bufSize: u32 = 1024): RefineFetcher {
    return new RefineFetcher(bufSize);
  }

  private readonly wp: WorkPackageFetcher;

  private constructor(bufSize: u32) {
    this.wp = WorkPackageFetcher.create(bufSize);
  }

  // ─── Delegated work-package methods ──────────────────────────────────

  /** Protocol constants (kind 0). */
  constants(): Result<ProtocolConstants, FetchError> {
    return this.wp.constants();
  }

  /** Entropy pool (kind 1). In refine context this is H₀ (anchor header hash, 32 bytes). */
  entropy(): Result<EntropyHash, FetchError> {
    return this.wp.entropy();
  }

  /** Full work package (kind 7). */
  workPackage(): Result<WorkPackage, FetchError> {
    return this.wp.fetchWorkPackage();
  }

  /** Authorizer code hash and config (kind 8). */
  authorizer(): Result<AuthorizerInfo, FetchError> {
    return this.wp.authorizer();
  }

  /** Authorization token blob (kind 9). */
  authorizationToken(): Result<BytesBlob, FetchError> {
    return this.wp.authorizationToken();
  }

  /** Refinement context (kind 10). */
  refineContext(): Result<RefinementContext, FetchError> {
    return this.wp.fetchRefineContext();
  }

  /** All work-item summaries (kind 11). */
  allWorkItems(): Result<StaticArray<WorkItemInfo>, FetchError> {
    return this.wp.allWorkItems();
  }

  /** Single work-item summary (kind 12). */
  oneWorkItem(workItem: u32): Result<WorkItemInfo, FetchError> {
    return this.wp.oneWorkItem(workItem);
  }

  /** Work-item payload blob (kind 13). */
  workItemPayload(workItem: u32): Result<BytesBlob, FetchError> {
    return this.wp.workItemPayload(workItem);
  }

  // ─── Refine-only methods ─────────────────────────────────────────────

  /** Authorizer trace data (kind 2). */
  authorizerTrace(): Result<BytesBlob, FetchError> {
    return this.wp.blob(FetchKind.AuthorizerTrace);
  }

  /** Extrinsic data for the current work item (kind 4). */
  myExtrinsic(index: u32): Result<BytesBlob, FetchError> {
    return this.wp.blob(FetchKind.MyExtrinsics, index);
  }

  /** Extrinsic data for another work item (kind 3). */
  otherExtrinsic(workItem: u32, index: u32): Result<BytesBlob, FetchError> {
    return this.wp.blob(FetchKind.OtherWorkItemExtrinsics, workItem, index);
  }

  /** Import segment for the current work item (kind 6). */
  myImport(index: u32): Result<BytesBlob, FetchError> {
    return this.wp.blob(FetchKind.MyImports, index);
  }

  /** Import segment for another work item (kind 5). */
  otherImport(workItem: u32, index: u32): Result<BytesBlob, FetchError> {
    return this.wp.blob(FetchKind.OtherWorkItemImports, workItem, index);
  }
}
