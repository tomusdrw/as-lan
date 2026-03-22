/**
 * Typed structs for fetch results shared across invocation contexts.
 *
 * Includes protocol constants (kind 0) and work-package types (kinds 7-13).
 *
 * GP §14.3:
 *   P ≡ { j ∈ Y, h ∈ N_S, u ∈ H, p ∈ Y, x ∈ X, w ∈ ⟦I⟧ }
 *   I ≡ { s ∈ N_S, h ∈ H, y ∈ Y, g ∈ N_G, a ∈ N_G, e ∈ N,
 *         i ∈ C{H ∪ (H⊞), N}H, x ∈ ⟦(H, N)⟧ }
 */

import { Bytes32, BytesBlob } from "../core/bytes";
import { Decoder } from "../core/codec/decode";
import { Encoder } from "../core/codec/encode";
import { CodeHash, ServiceId } from "./types";

/**
 * Protocol constants (fetch kind 0).
 *
 * GP Appendix B.5, eq B.17:
 *   𝐜 = E(E₈(B_I), E₈(B_L), E₈(B_S), E₂(C), E₄(D), E₄(E),
 *        E₈(G_A), E₈(G_I), E₈(G_R), E₈(G_T),
 *        E₂(H), E₂(I), E₂(J), E₂(K), E₄(L),
 *        E₂(N), E₂(O), E₂(P), E₂(Q), E₂(R), E₂(T), E₂(U),
 *        E₂(V), E₄(W_A), E₄(W_B), E₄(W_C), E₄(W_E), E₄(W_M),
 *        E₄(W_P), E₄(W_R), E₄(W_T), E₄(W_X), E₄(Y))
 *
 * Total size: 3×8 + 2×4 + 4×8 + 9×2 + 1×4 + 6×2 + 10×4 = 24+8+32+18+4+12+40 = 138 bytes
 */
export class ProtocolConstants {
  static create(
    electiveItemBalance: u64,
    electiveByteBalance: u64,
    baseServiceBalance: u64,
    coreCount: u16,
    preimageExpungePeriod: u32,
    epochLength: u32,
    gasAccumulateReport: u64,
    gasIsAuthorized: u64,
    gasMaxRefine: u64,
    gasMaxBlock: u64,
    recentHistoryLength: u16,
    maxWorkItems: u16,
    maxReportDeps: u16,
    maxTicketsPerExtrinsic: u16,
    maxLookupAnchorAge: u32,
    ticketsPerValidator: u16,
    maxAuthorizersPerCore: u16,
    slotDuration: u16,
    authorizersQueueSize: u16,
    rotationPeriod: u16,
    maxExtrinsicsPerWorkItem: u16,
    reportTimeoutGracePeriod: u16,
    validatorsCount: u16,
    maxAllocatedWorkPackageSize: u32,
    maxEncodedWorkPackageSize: u32,
    maxAuthorizerCodeSize: u32,
    erasureCodedPieceSize: u32,
    maxImportSegments: u32,
    ecPiecesPerSegment: u32,
    maxWorkReportSize: u32,
    transferMemoSize: u32,
    maxExportSegments: u32,
    contestLength: u32,
  ): ProtocolConstants {
    return new ProtocolConstants(
      electiveItemBalance,
      electiveByteBalance,
      baseServiceBalance,
      coreCount,
      preimageExpungePeriod,
      epochLength,
      gasAccumulateReport,
      gasIsAuthorized,
      gasMaxRefine,
      gasMaxBlock,
      recentHistoryLength,
      maxWorkItems,
      maxReportDeps,
      maxTicketsPerExtrinsic,
      maxLookupAnchorAge,
      ticketsPerValidator,
      maxAuthorizersPerCore,
      slotDuration,
      authorizersQueueSize,
      rotationPeriod,
      maxExtrinsicsPerWorkItem,
      reportTimeoutGracePeriod,
      validatorsCount,
      maxAllocatedWorkPackageSize,
      maxEncodedWorkPackageSize,
      maxAuthorizerCodeSize,
      erasureCodedPieceSize,
      maxImportSegments,
      ecPiecesPerSegment,
      maxWorkReportSize,
      transferMemoSize,
      maxExportSegments,
      contestLength,
    );
  }

  static decode(d: Decoder): ProtocolConstants {
    return new ProtocolConstants(
      d.u64(),
      d.u64(),
      d.u64(), // B_I, B_L, B_S
      d.u16(),
      d.u32(),
      d.u32(), // C, D, E
      d.u64(),
      d.u64(),
      d.u64(),
      d.u64(), // G_A, G_I, G_R, G_T
      d.u16(),
      d.u16(),
      d.u16(),
      d.u16(), // H, I, J, K
      d.u32(), // L
      d.u16(),
      d.u16(),
      d.u16(),
      d.u16(),
      d.u16(),
      d.u16(),
      d.u16(), // N, O, P, Q, R, T, U
      d.u16(), // V
      d.u32(),
      d.u32(),
      d.u32(),
      d.u32(),
      d.u32(), // W_A, W_B, W_C, W_E, W_M
      d.u32(),
      d.u32(),
      d.u32(),
      d.u32(),
      d.u32(), // W_P, W_R, W_T, W_X, Y
    );
  }

  private constructor(
    /** B_I: Elective item balance (deposit per storage item). */
    public electiveItemBalance: u64,
    /** B_L: Elective byte balance (deposit per storage byte). */
    public electiveByteBalance: u64,
    /** B_S: Base service balance (minimum balance for a service account). */
    public baseServiceBalance: u64,
    /** C: Number of cores. */
    public coreCount: u16,
    /** D: Preimage expunge period (timeslots). */
    public preimageExpungePeriod: u32,
    /** E: Epoch length (timeslots per epoch). */
    public epochLength: u32,
    /** G_A: Gas allocated to invoke a work-report for accumulation. */
    public gasAccumulateReport: u64,
    /** G_I: Gas allocated for is_authorized invocation. */
    public gasIsAuthorized: u64,
    /** G_R: Maximum gas for a single refine invocation. */
    public gasMaxRefine: u64,
    /** G_T: Maximum total gas per block. */
    public gasMaxBlock: u64,
    /** H: Recent history length (number of recent blocks tracked). */
    public recentHistoryLength: u16,
    /** I: Maximum number of work items per work package. */
    public maxWorkItems: u16,
    /** J: Maximum number of work-report dependencies. */
    public maxReportDeps: u16,
    /** K: Maximum tickets per extrinsic. */
    public maxTicketsPerExtrinsic: u16,
    /** L: Maximum lookup-anchor age (timeslots). */
    public maxLookupAnchorAge: u32,
    /** N: Tickets per validator. */
    public ticketsPerValidator: u16,
    /** O: Maximum authorizers per core. */
    public maxAuthorizersPerCore: u16,
    /** P: Slot duration (seconds). */
    public slotDuration: u16,
    /** Q: Authorizers queue size. */
    public authorizersQueueSize: u16,
    /** R: Rotation period (timeslots). */
    public rotationPeriod: u16,
    /** T: Maximum extrinsics per work item. */
    public maxExtrinsicsPerWorkItem: u16,
    /** U: Report timeout grace period (timeslots). */
    public reportTimeoutGracePeriod: u16,
    /** V: Number of validators. */
    public validatorsCount: u16,
    /** W_A: Maximum allocated work-package size (bytes). */
    public maxAllocatedWorkPackageSize: u32,
    /** W_B: Maximum encoded work-package size (bytes). */
    public maxEncodedWorkPackageSize: u32,
    /** W_C: Maximum authorizer code size (bytes). */
    public maxAuthorizerCodeSize: u32,
    /** W_E: Erasure-coded piece size (bytes). */
    public erasureCodedPieceSize: u32,
    /** W_M: Maximum total import segments per work package. */
    public maxImportSegments: u32,
    /** W_P: Number of erasure-coded pieces per segment. */
    public ecPiecesPerSegment: u32,
    /** W_R: Maximum work-report size (bytes). */
    public maxWorkReportSize: u32,
    /** W_T: Transfer memo size (bytes). */
    public transferMemoSize: u32,
    /** W_X: Maximum total export segments per work package. */
    public maxExportSegments: u32,
    /** Y: Contest length (timeslots). */
    public contestLength: u32,
  ) {}

  encode(e: Encoder): void {
    e.u64(this.electiveItemBalance);
    e.u64(this.electiveByteBalance);
    e.u64(this.baseServiceBalance);
    e.u16(this.coreCount);
    e.u32(this.preimageExpungePeriod);
    e.u32(this.epochLength);
    e.u64(this.gasAccumulateReport);
    e.u64(this.gasIsAuthorized);
    e.u64(this.gasMaxRefine);
    e.u64(this.gasMaxBlock);
    e.u16(this.recentHistoryLength);
    e.u16(this.maxWorkItems);
    e.u16(this.maxReportDeps);
    e.u16(this.maxTicketsPerExtrinsic);
    e.u32(this.maxLookupAnchorAge);
    e.u16(this.ticketsPerValidator);
    e.u16(this.maxAuthorizersPerCore);
    e.u16(this.slotDuration);
    e.u16(this.authorizersQueueSize);
    e.u16(this.rotationPeriod);
    e.u16(this.maxExtrinsicsPerWorkItem);
    e.u16(this.reportTimeoutGracePeriod);
    e.u16(this.validatorsCount);
    e.u32(this.maxAllocatedWorkPackageSize);
    e.u32(this.maxEncodedWorkPackageSize);
    e.u32(this.maxAuthorizerCodeSize);
    e.u32(this.erasureCodedPieceSize);
    e.u32(this.maxImportSegments);
    e.u32(this.ecPiecesPerSegment);
    e.u32(this.maxWorkReportSize);
    e.u32(this.transferMemoSize);
    e.u32(this.maxExportSegments);
    e.u32(this.contestLength);
  }
}

/**
 * Authorizer info (fetch kind 8).
 *
 * Encoding: code_hash(32) ⌢ config(rest)
 */
export class AuthorizerInfo {
  static create(codeHash: CodeHash, config: BytesBlob): AuthorizerInfo {
    return new AuthorizerInfo(codeHash, config);
  }

  static decode(d: Decoder): AuthorizerInfo {
    const codeHash = d.bytes32();
    // Config extends to end of data — read remaining bytes.
    const remaining = d.source.length - d.bytesRead();
    const config = d.bytesFixLen(remaining);
    return new AuthorizerInfo(codeHash, config);
  }

  private constructor(
    /** Authorization code hash. */
    public codeHash: CodeHash,
    /** Configuration/parametrization blob. */
    public config: BytesBlob,
  ) {}

  encode(e: Encoder): void {
    e.bytesFixLen(this.codeHash.raw);
    e.bytesFixLen(this.config.raw);
  }
}

/**
 * Refinement context (fetch kind 10).
 *
 * Corresponds to GP type X ≡ { a, s, b, l, t, p }.
 *
 * Encoding: anchor(32) + stateRoot(32) + beefyRoot(32)
 *         + lookupAnchor(32) + timeslot(u32 LE)
 *         + prerequisites(varlen sequence of Bytes32)
 */
export class RefinementContext {
  static create(
    anchor: Bytes32,
    stateRoot: Bytes32,
    beefyRoot: Bytes32,
    lookupAnchor: Bytes32,
    timeslot: u32,
    prerequisites: StaticArray<Bytes32>,
  ): RefinementContext {
    return new RefinementContext(anchor, stateRoot, beefyRoot, lookupAnchor, timeslot, prerequisites);
  }

  static decode(d: Decoder): RefinementContext {
    const anchor = d.bytes32();
    const stateRoot = d.bytes32();
    const beefyRoot = d.bytes32();
    const lookupAnchor = d.bytes32();
    const timeslot = d.u32();
    const count = d.varU32();
    const prerequisites = new StaticArray<Bytes32>(count);
    for (let i: u32 = 0; i < count; i++) {
      prerequisites[i] = d.bytes32();
    }
    return new RefinementContext(anchor, stateRoot, beefyRoot, lookupAnchor, timeslot, prerequisites);
  }

  private constructor(
    /** Anchor block header hash. */
    public anchor: Bytes32,
    /** Posterior state root of the anchor block. */
    public stateRoot: Bytes32,
    /** Posterior Beefy root of the anchor block. */
    public beefyRoot: Bytes32,
    /** Lookup-anchor block header hash. */
    public lookupAnchor: Bytes32,
    /** Lookup-anchor timeslot. */
    public timeslot: u32,
    /** Prerequisite work-package hashes. */
    public prerequisites: StaticArray<Bytes32>,
  ) {}

  encode(e: Encoder): void {
    e.bytesFixLen(this.anchor.raw);
    e.bytesFixLen(this.stateRoot.raw);
    e.bytesFixLen(this.beefyRoot.raw);
    e.bytesFixLen(this.lookupAnchor.raw);
    e.u32(this.timeslot);
    e.varU64(u64(this.prerequisites.length));
    for (let i = 0; i < this.prerequisites.length; i++) {
      e.bytesFixLen(this.prerequisites[i].raw);
    }
  }
}

/**
 * Work-item summary (fetch kinds 11-12).
 *
 * Corresponds to GP function S(w).
 *
 * Encoding: serviceId(u32) + codeHash(32) + gasRefine(u64) + gasAccumulate(u64)
 *         + exportCount(u16) + importCount(u16) + extrinsicCount(u16)
 *         + payloadLength(u32)
 */
export class WorkItemInfo {
  static create(
    serviceId: ServiceId,
    codeHash: CodeHash,
    gasRefine: u64,
    gasAccumulate: u64,
    exportCount: u16,
    importCount: u16,
    extrinsicCount: u16,
    payloadLength: u32,
  ): WorkItemInfo {
    return new WorkItemInfo(
      serviceId,
      codeHash,
      gasRefine,
      gasAccumulate,
      exportCount,
      importCount,
      extrinsicCount,
      payloadLength,
    );
  }

  static decode(d: Decoder): WorkItemInfo {
    const serviceId = d.u32();
    const codeHash = d.bytes32();
    const gasRefine = d.u64();
    const gasAccumulate = d.u64();
    const exportCount = d.u16();
    const importCount = d.u16();
    const extrinsicCount = d.u16();
    const payloadLength = d.u32();
    return new WorkItemInfo(
      serviceId,
      codeHash,
      gasRefine,
      gasAccumulate,
      exportCount,
      importCount,
      extrinsicCount,
      payloadLength,
    );
  }

  private constructor(
    /** Service index this work item relates to. */
    public serviceId: ServiceId,
    /** Code hash of the service at time of reporting. */
    public codeHash: CodeHash,
    /** Gas limit for refinement. */
    public gasRefine: u64,
    /** Gas limit for accumulation. */
    public gasAccumulate: u64,
    /** Number of exported data segments. */
    public exportCount: u16,
    /** Number of imported data segments. */
    public importCount: u16,
    /** Number of extrinsic data items. */
    public extrinsicCount: u16,
    /** Length of the work-item payload in bytes. */
    public payloadLength: u32,
  ) {}

  encode(e: Encoder): void {
    e.u32(this.serviceId);
    e.bytesFixLen(this.codeHash.raw);
    e.u64(this.gasRefine);
    e.u64(this.gasAccumulate);
    e.u16(this.exportCount);
    e.u16(this.importCount);
    e.u16(this.extrinsicCount);
    e.u32(this.payloadLength);
  }
}

/**
 * Reference to an imported data segment within a work item.
 *
 * GP §14.3: each import is identified by a hash (segment-root H or
 * work-package hash H⊞) and a segment index.
 *
 * Encoding: tag(u8: 0=segment-root, 1=work-package) + hash(32) + index(varU64)
 */
export class ImportRef {
  static create(hash: Bytes32, isWorkPackageHash: bool, index: u32): ImportRef {
    return new ImportRef(hash, isWorkPackageHash, index);
  }

  static decode(d: Decoder): ImportRef {
    const tag = d.u8();
    const hash = d.bytes32();
    const index = d.varU32();
    return new ImportRef(hash, tag !== 0, index);
  }

  private constructor(
    /** Segment-root hash or work-package hash. */
    public hash: Bytes32,
    /** True if hash identifies a work-package (H⊞), false for segment-root (H). */
    public isWorkPackageHash: bool,
    /** Segment index within the identified package/root. */
    public index: u32,
  ) {}

  encode(e: Encoder): void {
    e.u8(this.isWorkPackageHash ? 1 : 0);
    e.bytesFixLen(this.hash.raw);
    e.varU64(u64(this.index));
  }
}

/**
 * Extrinsic data reference within a work item.
 *
 * GP §14.3: x ∈ ⟦(H, N)⟧ — hash and length of data to be introduced.
 *
 * Encoding: hash(32) + length(varU64)
 */
export class ExtrinsicRef {
  static create(hash: Bytes32, length: u32): ExtrinsicRef {
    return new ExtrinsicRef(hash, length);
  }

  static decode(d: Decoder): ExtrinsicRef {
    const hash = d.bytes32();
    const length = d.varU32();
    return new ExtrinsicRef(hash, length);
  }

  private constructor(
    /** Hash of the extrinsic data. */
    public hash: Bytes32,
    /** Length of the extrinsic data in bytes. */
    public length: u32,
  ) {}

  encode(e: Encoder): void {
    e.bytesFixLen(this.hash.raw);
    e.varU64(u64(this.length));
  }
}

/**
 * Full work item (GP type I).
 *
 * GP §14.3:
 *   I ≡ { s ∈ N_S, h ∈ H, y ∈ Y, g ∈ N_G, a ∈ N_G, e ∈ N,
 *         i ∈ C{H ∪ (H⊞), N}H, x ∈ ⟦(H, N)⟧ }
 *
 * Encoding: serviceId(u32) + codeHash(32) + payload(varlen)
 *         + gasRefine(u64) + gasAccumulate(u64) + exportCount(varU64)
 *         + imports(varlen seq of ImportRef) + extrinsics(varlen seq of ExtrinsicRef)
 */
export class WorkItem {
  static create(
    serviceId: ServiceId,
    codeHash: CodeHash,
    payload: BytesBlob,
    gasRefine: u64,
    gasAccumulate: u64,
    exportCount: u32,
    imports: StaticArray<ImportRef>,
    extrinsics: StaticArray<ExtrinsicRef>,
  ): WorkItem {
    return new WorkItem(serviceId, codeHash, payload, gasRefine, gasAccumulate, exportCount, imports, extrinsics);
  }

  static decode(d: Decoder): WorkItem {
    const serviceId = d.u32();
    const codeHash = d.bytes32();
    const payload = d.bytesVarLen();
    const gasRefine = d.u64();
    const gasAccumulate = d.u64();
    const exportCount = d.varU32();
    const importCount = d.varU32();
    const imports = new StaticArray<ImportRef>(importCount);
    for (let i: u32 = 0; i < importCount; i++) {
      imports[i] = ImportRef.decode(d);
    }
    const extrinsicCount = d.varU32();
    const extrinsics = new StaticArray<ExtrinsicRef>(extrinsicCount);
    for (let i: u32 = 0; i < extrinsicCount; i++) {
      extrinsics[i] = ExtrinsicRef.decode(d);
    }
    return new WorkItem(serviceId, codeHash, payload, gasRefine, gasAccumulate, exportCount, imports, extrinsics);
  }

  private constructor(
    /** Service index this work item relates to. */
    public serviceId: ServiceId,
    /** Code hash of the service at time of reporting. */
    public codeHash: CodeHash,
    /** Work-item payload. */
    public payload: BytesBlob,
    /** Gas limit for refinement. */
    public gasRefine: u64,
    /** Gas limit for accumulation. */
    public gasAccumulate: u64,
    /** Number of data segments to export. */
    public exportCount: u32,
    /** Imported data segment references. */
    public imports: StaticArray<ImportRef>,
    /** Extrinsic data references (hash + length). */
    public extrinsics: StaticArray<ExtrinsicRef>,
  ) {}

  encode(e: Encoder): void {
    e.u32(this.serviceId);
    e.bytesFixLen(this.codeHash.raw);
    e.bytesVarLen(this.payload);
    e.u64(this.gasRefine);
    e.u64(this.gasAccumulate);
    e.varU64(u64(this.exportCount));
    e.varU64(u64(this.imports.length));
    for (let i = 0; i < this.imports.length; i++) {
      this.imports[i].encode(e);
    }
    e.varU64(u64(this.extrinsics.length));
    for (let i = 0; i < this.extrinsics.length; i++) {
      this.extrinsics[i].encode(e);
    }
  }
}

/**
 * Full work package (GP type P, fetch kind 7).
 *
 * GP §14.3:
 *   P ≡ { j ∈ Y, h ∈ N_S, u ∈ H, p ∈ Y, x ∈ X, w ∈ ⟦I⟧ }
 *
 * Encoding: authToken(varlen) + authServiceId(u32) + authCodeHash(32)
 *         + authConfig(varlen) + context(RefinementContext)
 *         + workItems(varlen seq of WorkItem)
 */
export class WorkPackage {
  static create(
    authToken: BytesBlob,
    authServiceId: ServiceId,
    authCodeHash: CodeHash,
    authConfig: BytesBlob,
    context: RefinementContext,
    workItems: StaticArray<WorkItem>,
  ): WorkPackage {
    return new WorkPackage(authToken, authServiceId, authCodeHash, authConfig, context, workItems);
  }

  static decode(d: Decoder): WorkPackage {
    const authToken = d.bytesVarLen();
    const authServiceId = d.u32();
    const authCodeHash = d.bytes32();
    const authConfig = d.bytesVarLen();
    const context = RefinementContext.decode(d);
    const itemCount = d.varU32();
    const workItems = new StaticArray<WorkItem>(itemCount);
    for (let i: u32 = 0; i < itemCount; i++) {
      workItems[i] = WorkItem.decode(d);
    }
    return new WorkPackage(authToken, authServiceId, authCodeHash, authConfig, context, workItems);
  }

  private constructor(
    /** Authorization token (j). */
    public authToken: BytesBlob,
    /** Service index hosting the authorization code (h). */
    public authServiceId: ServiceId,
    /** Authorization code hash (u). */
    public authCodeHash: CodeHash,
    /** Authorizer configuration blob (p). */
    public authConfig: BytesBlob,
    /** Refinement context (x). */
    public context: RefinementContext,
    /** Work items (w). */
    public workItems: StaticArray<WorkItem>,
  ) {}

  encode(e: Encoder): void {
    e.bytesVarLen(this.authToken);
    e.u32(this.authServiceId);
    e.bytesFixLen(this.authCodeHash.raw);
    e.bytesVarLen(this.authConfig);
    this.context.encode(e);
    e.varU64(u64(this.workItems.length));
    for (let i = 0; i < this.workItems.length; i++) {
      this.workItems[i].encode(e);
    }
  }
}
