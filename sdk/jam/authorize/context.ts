/**
 * Authorize (is_authorized) invocation context.
 *
 * Holds all codec instances for work-package data.
 */

import { WorkPackageContext } from "../work-package-context";

export class AuthorizeContext extends WorkPackageContext {
  static create(): AuthorizeContext {
    return new AuthorizeContext();
  }

  private constructor() {
    super();
  }
}
