/**
 * Shared context for invocation contexts that have access to work-package data (kinds 7-13).
 *
 * Used by both the authorize and refine contexts.
 */

import { Bytes32Codec } from "../core/codec/bytes32";
import {
  AuthorizerInfoCodec,
  ExtrinsicRefCodec,
  ImportRefCodec,
  ProtocolConstantsCodec,
  RefinementContextCodec,
  WorkItemCodec,
  WorkItemInfoCodec,
  WorkPackageCodec,
} from "./work-package";

export class WorkPackageContext {
  static create(): WorkPackageContext {
    return new WorkPackageContext();
  }

  // Codecs
  readonly bytes32: Bytes32Codec;
  readonly protocolConstants: ProtocolConstantsCodec;
  readonly authorizerInfo: AuthorizerInfoCodec;
  readonly workItemInfo: WorkItemInfoCodec;
  readonly importRef: ImportRefCodec;
  readonly extrinsicRef: ExtrinsicRefCodec;
  readonly refinementContext: RefinementContextCodec;
  readonly workItem: WorkItemCodec;
  readonly workPackage: WorkPackageCodec;

  protected constructor() {
    const bytes32 = Bytes32Codec.create();
    const importRef = ImportRefCodec.create();
    const extrinsicRef = ExtrinsicRefCodec.create();
    const refinementContext = RefinementContextCodec.create(bytes32);
    const workItem = WorkItemCodec.create(importRef, extrinsicRef);

    this.bytes32 = bytes32;
    this.protocolConstants = ProtocolConstantsCodec.create();
    this.authorizerInfo = AuthorizerInfoCodec.create();
    this.workItemInfo = WorkItemInfoCodec.create();
    this.importRef = importRef;
    this.extrinsicRef = extrinsicRef;
    this.refinementContext = refinementContext;
    this.workItem = workItem;
    this.workPackage = WorkPackageCodec.create(refinementContext, workItem);
  }
}
