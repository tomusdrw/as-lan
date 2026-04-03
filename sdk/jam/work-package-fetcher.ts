/**
 * Typed fetcher for work-package data (kinds 0, 7-13).
 *
 * Shared by both the authorize and refine contexts via composition.
 * Codecs are created lazily — only when first accessed.
 */

import { BytesBlob } from "../core/bytes";
import { Bytes32Codec } from "../core/codec/bytes32";
import { Decoder } from "../core/codec/decode";
import { panic } from "../core/panic";
import { FetchKind } from "../ecalli/general/fetch";
import { FetchBuffer, fetchAndDecode, fetchAndDecodeOptional, fetchBlob, fetchBlobOrPanic, fetchRawOrPanic } from "./fetcher";
import { EntropyHash } from "./types";
import {
  AuthorizerInfo,
  AuthorizerInfoCodec,
  ExtrinsicRefCodec,
  ImportRefCodec,
  ProtocolConstants,
  ProtocolConstantsCodec,
  RefinementContext,
  RefinementContextCodec,
  WorkItemCodec,
  WorkItemInfo,
  WorkItemInfoCodec,
  WorkPackage,
  WorkPackageCodec,
} from "./work-package";

export class WorkPackageFetcher {
  static create(bufSize: u32 = 1024): WorkPackageFetcher {
    return new WorkPackageFetcher(bufSize);
  }

  private readonly fb: FetchBuffer;

  // Lazy codec fields
  private _protocolConstants: ProtocolConstantsCodec | null = null;
  private _bytes32: Bytes32Codec | null = null;
  private _authorizerInfo: AuthorizerInfoCodec | null = null;
  private _workItemInfo: WorkItemInfoCodec | null = null;
  private _refinementContext: RefinementContextCodec | null = null;
  private _workPackage: WorkPackageCodec | null = null;

  private constructor(bufSize: u32) {
    this.fb = FetchBuffer.create(bufSize);
  }

  private get protocolConstants(): ProtocolConstantsCodec {
    if (this._protocolConstants === null) this._protocolConstants = ProtocolConstantsCodec.create();
    return this._protocolConstants!;
  }

  private get bytes32(): Bytes32Codec {
    if (this._bytes32 === null) this._bytes32 = Bytes32Codec.create();
    return this._bytes32!;
  }

  private get authorizerInfo(): AuthorizerInfoCodec {
    if (this._authorizerInfo === null) this._authorizerInfo = AuthorizerInfoCodec.create();
    return this._authorizerInfo!;
  }

  private get workItemInfo(): WorkItemInfoCodec {
    if (this._workItemInfo === null) this._workItemInfo = WorkItemInfoCodec.create();
    return this._workItemInfo!;
  }

  private get refinementContext(): RefinementContextCodec {
    if (this._refinementContext === null) this._refinementContext = RefinementContextCodec.create(this.bytes32);
    return this._refinementContext!;
  }

  private get workPackage(): WorkPackageCodec {
    if (this._workPackage === null) {
      const importRef = ImportRefCodec.create();
      const extrinsicRef = ExtrinsicRefCodec.create();
      const workItem = WorkItemCodec.create(importRef, extrinsicRef);
      this._workPackage = WorkPackageCodec.create(this.refinementContext, workItem);
    }
    return this._workPackage!;
  }

  /** Protocol constants (kind 0, always available in all contexts). */
  constants(): ProtocolConstants {
    return fetchAndDecode<ProtocolConstants>(this.fb, this.protocolConstants, FetchKind.Constants);
  }

  /** Entropy pool (kind 1). */
  entropy(): EntropyHash {
    return fetchAndDecode<EntropyHash>(this.fb, this.bytes32, FetchKind.Entropy);
  }

  /** Full work package (kind 7). GP type P ≡ { j, h, u, p, x, w }. */
  fetchWorkPackage(): WorkPackage {
    return fetchAndDecode<WorkPackage>(this.fb, this.workPackage, FetchKind.WorkPackage);
  }

  /** Authorizer code hash and config (kind 8). */
  authorizer(): AuthorizerInfo {
    return fetchAndDecode<AuthorizerInfo>(this.fb, this.authorizerInfo, FetchKind.Authorizer);
  }

  /** Authorization token blob (kind 9). */
  authorizationToken(): BytesBlob {
    return fetchBlobOrPanic(this.fb, FetchKind.AuthorizationToken);
  }

  /** Refinement context (kind 10). */
  fetchRefineContext(): RefinementContext {
    return fetchAndDecode<RefinementContext>(this.fb, this.refinementContext, FetchKind.RefineContext);
  }

  /** All work-item summaries as a decoded array (kind 11). */
  allWorkItems(): StaticArray<WorkItemInfo> {
    const raw = fetchRawOrPanic(this.fb, FetchKind.AllWorkItems);
    const d = Decoder.fromBlob(raw);
    const r = d.sequenceVarLen<WorkItemInfo>(this.workItemInfo);
    if (r.isError || !d.isFinished()) panic("allWorkItems: host returned malformed data");
    return r.okay!;
  }

  /** Single work-item summary (kind 12). Returns null if index is out of bounds. */
  oneWorkItem(workItem: u32): WorkItemInfo | null {
    return fetchAndDecodeOptional<WorkItemInfo>(this.fb, this.workItemInfo, FetchKind.OneWorkItem, workItem);
  }

  /** Work-item payload blob (kind 13). Returns null if index is out of bounds. */
  workItemPayload(workItem: u32): BytesBlob | null {
    return fetchBlob(this.fb, FetchKind.WorkItemPayload, workItem);
  }

  /** Fetch a raw blob by kind, panicking if unavailable. */
  blobOrPanic(kind: FetchKind, param1: u32 = 0, param2: u32 = 0): BytesBlob {
    return fetchBlobOrPanic(this.fb, kind, param1, param2);
  }

  /** Fetch a raw blob by kind, returning null if unavailable. */
  blob(kind: FetchKind, param1: u32 = 0, param2: u32 = 0): BytesBlob | null {
    return fetchBlob(this.fb, kind, param1, param2);
  }
}
