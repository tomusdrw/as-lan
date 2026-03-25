/**
 * Typed fetcher for the authorize (is_authorized) context.
 *
 * Available fetch kinds: 0 (constants), 7-13 (work package data).
 * Entropy (kind 1) is NOT available in this context.
 *
 * Composes WorkPackageFetcher for all methods.
 */

import { BytesBlob } from "../../core/bytes";
import { Result } from "../../core/result";
import { FetchError } from "../fetcher";
import { AuthorizerInfo, ProtocolConstants, RefinementContext, WorkItemInfo, WorkPackage } from "../work-package";
import { WorkPackageFetcher } from "../work-package-fetcher";

export class AuthorizeFetcher {
  static create(bufSize: u32 = 1024): AuthorizeFetcher {
    return new AuthorizeFetcher(bufSize);
  }

  private readonly wp: WorkPackageFetcher;

  private constructor(bufSize: u32) {
    this.wp = WorkPackageFetcher.create(bufSize);
  }

  /** Protocol constants (kind 0). */
  constants(): Result<ProtocolConstants, FetchError> {
    return this.wp.constants();
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
}
