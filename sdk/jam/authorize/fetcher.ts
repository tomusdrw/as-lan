/**
 * Typed fetcher for the authorize (is_authorized) context.
 *
 * Available fetch kinds: 0 (constants), 7-13 (work package data).
 * Entropy (kind 1) is NOT available in this context.
 *
 * Composes WorkPackageFetcher for all methods.
 */

import { BytesBlob } from "../../core/bytes";
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
  constants(): ProtocolConstants {
    return this.wp.constants();
  }

  /** Full work package (kind 7). */
  workPackage(): WorkPackage {
    return this.wp.fetchWorkPackage();
  }

  /** Authorizer code hash and config (kind 8). */
  authorizer(): AuthorizerInfo {
    return this.wp.authorizer();
  }

  /** Authorization token blob (kind 9). */
  authorizationToken(): BytesBlob {
    return this.wp.authorizationToken();
  }

  /** Refinement context (kind 10). */
  refineContext(): RefinementContext {
    return this.wp.fetchRefineContext();
  }

  /** All work-item summaries (kind 11). */
  allWorkItems(): StaticArray<WorkItemInfo> {
    return this.wp.allWorkItems();
  }

  /** Single work-item summary (kind 12). Returns null if index is out of bounds. */
  oneWorkItem(workItem: u32): WorkItemInfo | null {
    return this.wp.oneWorkItem(workItem);
  }

  /** Work-item payload blob (kind 13). Returns null if index is out of bounds. */
  workItemPayload(workItem: u32): BytesBlob | null {
    return this.wp.workItemPayload(workItem);
  }
}
