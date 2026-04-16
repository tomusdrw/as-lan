/**
 * Authorize (is_authorized) invocation context.
 *
 * Parses the core index from the entry-point arguments and provides
 * typed fetch functions via ./fetcher.ts.
 */

import { Decoder } from "../../core/codec/decode";
import { readFromMemory } from "../../core/mem";
import { panic } from "../../core/panic";
import { gas } from "../../ecalli/general/gas";
import { Preimages } from "../preimages";
import { CurrentServiceData } from "../service-data";
import { CoreIndex } from "../types";
import { AuthorizeFetcher } from "./fetcher";

export class AuthorizeContext {
  static create(): AuthorizeContext {
    return new AuthorizeContext();
  }

  private constructor() {}

  /** Return the remaining gas after this call (ecalli 0). */
  remainingGas(): i64 {
    return gas();
  }

  // ── Helper factories ────────────────────────────────────────────────

  /** Create an AuthorizeFetcher for this context (fetch kinds 0, 7-13). */
  fetcher(bufSize: u32 = 1024): AuthorizeFetcher {
    return AuthorizeFetcher.create(bufSize);
  }

  /** Create a Preimages helper (lookup only — no historical or lifecycle ops). */
  preimages(bufSize: u32 = 1024): Preimages {
    return Preimages.create(bufSize);
  }

  /** Create a CurrentServiceData helper for storage read/write and account info. */
  serviceData(bufSize: u32 = 1024): CurrentServiceData {
    return CurrentServiceData.create(bufSize);
  }

  /** Parse the core index from the raw (ptr, len) entry-point buffer. */
  parseCoreIndex(ptr: u32, len: u32): CoreIndex {
    const d = Decoder.fromBlob(readFromMemory(ptr, len));
    const coreIndex = d.u16();
    if (d.isError) {
      panic("parseCoreIndex: insufficient bytes for CoreIndex");
    }
    return coreIndex;
  }
}
