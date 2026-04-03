/**
 * Authorize (is_authorized) invocation context.
 *
 * Parses the core index from the entry-point arguments and provides
 * typed fetch functions via ./fetcher.ts.
 */

import { Decoder } from "../../core/codec/decode";
import { readFromMemory } from "../../core/mem";
import { CoreIndex } from "../types";

export class AuthorizeContext {
  static create(): AuthorizeContext {
    return new AuthorizeContext();
  }

  private constructor() {}

  /** Parse the core index from the raw (ptr, len) entry-point buffer. */
  parseCoreIndex(ptr: u32, len: u32): CoreIndex {
    const d = Decoder.fromBlob(readFromMemory(ptr, len));
    return d.u16();
  }
}
