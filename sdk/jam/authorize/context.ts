/**
 * Authorize (is_authorized) invocation context.
 *
 * This context has no ABI parsing/encoding of its own — it only
 * provides the identity for the authorize entry point.
 * Typed fetch functions are available in ./fetcher.ts.
 */

export class AuthorizeContext {
  static create(): AuthorizeContext {
    return new AuthorizeContext();
  }

  private constructor() {}
}
