/**
 * High-level fetcher for the authorize (is_authorized) context.
 *
 * Available fetch kinds: 0 (constants), 7-13 (work package data).
 * Entropy (kind 1) is NOT available in this context.
 */

import { WorkPackageFetcher } from "../work-package-fetcher";

export class AuthorizeFetcher extends WorkPackageFetcher {
  static create(bufSize: u32 = 1024): AuthorizeFetcher {
    return new AuthorizeFetcher(bufSize);
  }

  private constructor(bufSize: u32 = 1024) {
    super(bufSize);
  }
}
