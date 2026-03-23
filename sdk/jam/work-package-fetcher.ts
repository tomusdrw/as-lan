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
  AuthorizerInfo, authorizerInfoCodec,
  RefinementContext, refinementContextCodec,
  WorkItemInfo, workItemInfoCodec,
  WorkPackage, workPackageCodec,
} from "./work-package";

export class WorkPackageFetcher extends Fetcher {
  /** Full work package (kind 7). GP type P ≡ { j, h, u, p, x, w }. */
  workPackage(): Result<WorkPackage, FetchError> {
    const raw = this.fetchRaw(FetchKind.WorkPackage);
    if (raw.isError) return Result.err<WorkPackage, FetchError>(raw.error);
    const d = Decoder.fromBlob(raw.okay!);
    const r = workPackageCodec.decode(d);
    if (r.isError) return Result.err<WorkPackage, FetchError>(FetchError.DecodeError);
    return Result.ok<WorkPackage, FetchError>(r.okay!);
  }

  /** Authorizer code hash and config (kind 8). */
  authorizer(): Result<AuthorizerInfo, FetchError> {
    const raw = this.fetchRaw(FetchKind.Authorizer);
    if (raw.isError) return Result.err<AuthorizerInfo, FetchError>(raw.error);
    const d = Decoder.fromBlob(raw.okay!);
    const r = authorizerInfoCodec.decode(d);
    if (r.isError) return Result.err<AuthorizerInfo, FetchError>(FetchError.DecodeError);
    return Result.ok<AuthorizerInfo, FetchError>(r.okay!);
  }

  /** Authorization token blob (kind 9). */
  authorizationToken(): Result<BytesBlob, FetchError> {
    return this.fetchBlob(FetchKind.AuthorizationToken);
  }

  /** Refinement context (kind 10). */
  refineContext(): Result<RefinementContext, FetchError> {
    const raw = this.fetchRaw(FetchKind.RefineContext);
    if (raw.isError) return Result.err<RefinementContext, FetchError>(raw.error);
    const d = Decoder.fromBlob(raw.okay!);
    const r = refinementContextCodec.decode(d);
    if (r.isError) return Result.err<RefinementContext, FetchError>(FetchError.DecodeError);
    return Result.ok<RefinementContext, FetchError>(r.okay!);
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
    const raw = this.fetchRaw(FetchKind.OneWorkItem, workItem);
    if (raw.isError) return Result.err<WorkItemInfo, FetchError>(raw.error);
    const d = Decoder.fromBlob(raw.okay!);
    const r = workItemInfoCodec.decode(d);
    if (r.isError) return Result.err<WorkItemInfo, FetchError>(FetchError.DecodeError);
    return Result.ok<WorkItemInfo, FetchError>(r.okay!);
  }

  /** Work-item payload blob (kind 13). */
  workItemPayload(workItem: u32): Result<BytesBlob, FetchError> {
    return this.fetchBlob(FetchKind.WorkItemPayload, workItem);
  }
}
