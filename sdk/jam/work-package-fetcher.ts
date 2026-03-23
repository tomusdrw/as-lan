/**
 * Intermediate fetcher for contexts that have access to the work package (p).
 *
 * Provides typed methods for fetch kinds 7-13. Used by both the authorize
 * and refine contexts.
 */

import { BytesBlob } from "../core/bytes";
import { Decoder } from "../core/codec/decode";
import { Result } from "../core/result";
import { FetchKind } from "../ecalli/general/fetch";
import { FetchError, Fetcher } from "./fetcher";
import {
  AuthorizerInfo,
  authorizerInfoCodec,
  RefinementContext,
  refinementContextCodec,
  WorkItemInfo,
  WorkPackage,
  workItemInfoCodec,
  workPackageCodec,
} from "./work-package";

export class WorkPackageFetcher extends Fetcher {
  /** Full work package (kind 7). GP type P ≡ { j, h, u, p, x, w }. */
  workPackage(): Result<WorkPackage, FetchError> {
    return this.fetchAndDecode<WorkPackage>(workPackageCodec, FetchKind.WorkPackage);
  }

  /** Authorizer code hash and config (kind 8). */
  authorizer(): Result<AuthorizerInfo, FetchError> {
    return this.fetchAndDecode<AuthorizerInfo>(authorizerInfoCodec, FetchKind.Authorizer);
  }

  /** Authorization token blob (kind 9). */
  authorizationToken(): Result<BytesBlob, FetchError> {
    return this.fetchBlob(FetchKind.AuthorizationToken);
  }

  /** Refinement context (kind 10). */
  refineContext(): Result<RefinementContext, FetchError> {
    return this.fetchAndDecode<RefinementContext>(refinementContextCodec, FetchKind.RefineContext);
  }

  /** All work-item summaries as a decoded array (kind 11). */
  allWorkItems(): Result<StaticArray<WorkItemInfo>, FetchError> {
    const raw = this.fetchRaw(FetchKind.AllWorkItems);
    if (raw.isError) return Result.err<StaticArray<WorkItemInfo>, FetchError>(raw.error);
    const d = Decoder.fromBlob(raw.okay!);
    const r = d.sequenceVarLen<WorkItemInfo>(workItemInfoCodec);
    if (r.isError) return Result.err<StaticArray<WorkItemInfo>, FetchError>(FetchError.DecodeError);
    return Result.ok<StaticArray<WorkItemInfo>, FetchError>(r.okay!);
  }

  /** Single work-item summary (kind 12). */
  oneWorkItem(workItem: u32): Result<WorkItemInfo, FetchError> {
    return this.fetchAndDecode<WorkItemInfo>(workItemInfoCodec, FetchKind.OneWorkItem, workItem);
  }

  /** Work-item payload blob (kind 13). */
  workItemPayload(workItem: u32): Result<BytesBlob, FetchError> {
    return this.fetchBlob(FetchKind.WorkItemPayload, workItem);
  }
}
