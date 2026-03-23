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
import { bytes32Codec } from "../core/codec/bytes32";
import { DecodeError, Decoder, TryDecode } from "../core/codec/decode";
import { Encoder, TryEncode } from "../core/codec/encode";
import { Result } from "../core/result";
import { CodeHash, ServiceId } from "./types";

// ─── ProtocolConstants ────────────────────────────────────────────────

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
 * Total size: 7×8 + 13×4 + 13×2 = 56+52+26 = 134 bytes
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
}

export class ProtocolConstantsCodec implements TryDecode<ProtocolConstants>, TryEncode<ProtocolConstants> {
  static create(): ProtocolConstantsCodec {
    return new ProtocolConstantsCodec();
  }
  private constructor() {}

  decode(d: Decoder): Result<ProtocolConstants, DecodeError> {
    const c = ProtocolConstants.create(
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
    if (d.isError) return Result.err<ProtocolConstants, DecodeError>(DecodeError.MissingBytes);
    return Result.ok<ProtocolConstants, DecodeError>(c);
  }

  encode(v: ProtocolConstants, e: Encoder): void {
    e.u64(v.electiveItemBalance);
    e.u64(v.electiveByteBalance);
    e.u64(v.baseServiceBalance);
    e.u16(v.coreCount);
    e.u32(v.preimageExpungePeriod);
    e.u32(v.epochLength);
    e.u64(v.gasAccumulateReport);
    e.u64(v.gasIsAuthorized);
    e.u64(v.gasMaxRefine);
    e.u64(v.gasMaxBlock);
    e.u16(v.recentHistoryLength);
    e.u16(v.maxWorkItems);
    e.u16(v.maxReportDeps);
    e.u16(v.maxTicketsPerExtrinsic);
    e.u32(v.maxLookupAnchorAge);
    e.u16(v.ticketsPerValidator);
    e.u16(v.maxAuthorizersPerCore);
    e.u16(v.slotDuration);
    e.u16(v.authorizersQueueSize);
    e.u16(v.rotationPeriod);
    e.u16(v.maxExtrinsicsPerWorkItem);
    e.u16(v.reportTimeoutGracePeriod);
    e.u16(v.validatorsCount);
    e.u32(v.maxAllocatedWorkPackageSize);
    e.u32(v.maxEncodedWorkPackageSize);
    e.u32(v.maxAuthorizerCodeSize);
    e.u32(v.erasureCodedPieceSize);
    e.u32(v.maxImportSegments);
    e.u32(v.ecPiecesPerSegment);
    e.u32(v.maxWorkReportSize);
    e.u32(v.transferMemoSize);
    e.u32(v.maxExportSegments);
    e.u32(v.contestLength);
  }
}

export const protocolConstantsCodec: ProtocolConstantsCodec = ProtocolConstantsCodec.create();

// ─── AuthorizerInfo ───────────────────────────────────────────────────

/**
 * Authorizer info (fetch kind 8).
 *
 * Encoding: code_hash(32) ⌢ config(rest)
 */
export class AuthorizerInfo {
  static create(codeHash: CodeHash, config: BytesBlob): AuthorizerInfo {
    return new AuthorizerInfo(codeHash, config);
  }

  private constructor(
    /** Authorization code hash. */
    public codeHash: CodeHash,
    /** Configuration/parametrization blob. */
    public config: BytesBlob,
  ) {}
}

export class AuthorizerInfoCodec implements TryDecode<AuthorizerInfo>, TryEncode<AuthorizerInfo> {
  static create(): AuthorizerInfoCodec {
    return new AuthorizerInfoCodec();
  }
  private constructor() {}

  decode(d: Decoder): Result<AuthorizerInfo, DecodeError> {
    const codeHash = d.bytes32();
    // Config extends to end of data — read remaining bytes.
    const remaining = d.source.length - d.bytesRead();
    const config = d.bytesFixLen(remaining);
    if (d.isError) return Result.err<AuthorizerInfo, DecodeError>(DecodeError.MissingBytes);
    return Result.ok<AuthorizerInfo, DecodeError>(AuthorizerInfo.create(codeHash, config));
  }

  encode(v: AuthorizerInfo, e: Encoder): void {
    e.bytesFixLen(v.codeHash.raw);
    e.bytesFixLen(v.config.raw);
  }
}

export const authorizerInfoCodec: AuthorizerInfoCodec = AuthorizerInfoCodec.create();

// ─── RefinementContext ────────────────────────────────────────────────

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
}

export class RefinementContextCodec implements TryDecode<RefinementContext>, TryEncode<RefinementContext> {
  static create(): RefinementContextCodec {
    return new RefinementContextCodec();
  }
  private constructor() {}

  decode(d: Decoder): Result<RefinementContext, DecodeError> {
    const anchor = d.bytes32();
    const stateRoot = d.bytes32();
    const beefyRoot = d.bytes32();
    const lookupAnchor = d.bytes32();
    const timeslot = d.u32();
    if (d.isError) return Result.err<RefinementContext, DecodeError>(DecodeError.MissingBytes);
    const prereqs = d.sequenceVarLen<Bytes32>(bytes32Codec);
    if (prereqs.isError) return Result.err<RefinementContext, DecodeError>(prereqs.error);
    return Result.ok<RefinementContext, DecodeError>(
      RefinementContext.create(anchor, stateRoot, beefyRoot, lookupAnchor, timeslot, prereqs.okay!),
    );
  }

  encode(v: RefinementContext, e: Encoder): void {
    e.bytesFixLen(v.anchor.raw);
    e.bytesFixLen(v.stateRoot.raw);
    e.bytesFixLen(v.beefyRoot.raw);
    e.bytesFixLen(v.lookupAnchor.raw);
    e.u32(v.timeslot);
    e.sequenceVarLen<Bytes32>(bytes32Codec, v.prerequisites);
  }
}

export const refinementContextCodec: RefinementContextCodec = RefinementContextCodec.create();

// ─── WorkItemInfo ─────────────────────────────────────────────────────

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
}

export class WorkItemInfoCodec implements TryDecode<WorkItemInfo>, TryEncode<WorkItemInfo> {
  static create(): WorkItemInfoCodec {
    return new WorkItemInfoCodec();
  }
  private constructor() {}

  decode(d: Decoder): Result<WorkItemInfo, DecodeError> {
    const v = WorkItemInfo.create(d.u32(), d.bytes32(), d.u64(), d.u64(), d.u16(), d.u16(), d.u16(), d.u32());
    if (d.isError) return Result.err<WorkItemInfo, DecodeError>(DecodeError.MissingBytes);
    return Result.ok<WorkItemInfo, DecodeError>(v);
  }

  encode(v: WorkItemInfo, e: Encoder): void {
    e.u32(v.serviceId);
    e.bytesFixLen(v.codeHash.raw);
    e.u64(v.gasRefine);
    e.u64(v.gasAccumulate);
    e.u16(v.exportCount);
    e.u16(v.importCount);
    e.u16(v.extrinsicCount);
    e.u32(v.payloadLength);
  }
}

export const workItemInfoCodec: WorkItemInfoCodec = WorkItemInfoCodec.create();

// ─── ImportRef ────────────────────────────────────────────────────────

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

  private constructor(
    /** Segment-root hash or work-package hash. */
    public hash: Bytes32,
    /** True if hash identifies a work-package (H⊞), false for segment-root (H). */
    public isWorkPackageHash: bool,
    /** Segment index within the identified package/root. */
    public index: u32,
  ) {}
}

export class ImportRefCodec implements TryDecode<ImportRef>, TryEncode<ImportRef> {
  static create(): ImportRefCodec {
    return new ImportRefCodec();
  }
  private constructor() {}

  decode(d: Decoder): Result<ImportRef, DecodeError> {
    const tag = d.u8();
    if (tag > 1) return Result.err<ImportRef, DecodeError>(DecodeError.InvalidData);
    const hash = d.bytes32();
    const index = d.varU32();
    if (d.isError) return Result.err<ImportRef, DecodeError>(DecodeError.MissingBytes);
    return Result.ok<ImportRef, DecodeError>(ImportRef.create(hash, tag === 1, index));
  }

  encode(v: ImportRef, e: Encoder): void {
    e.u8(v.isWorkPackageHash ? 1 : 0);
    e.bytesFixLen(v.hash.raw);
    e.varU64(u64(v.index));
  }
}

export const importRefCodec: ImportRefCodec = ImportRefCodec.create();

// ─── ExtrinsicRef ─────────────────────────────────────────────────────

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

  private constructor(
    /** Hash of the extrinsic data. */
    public hash: Bytes32,
    /** Length of the extrinsic data in bytes. */
    public length: u32,
  ) {}
}

export class ExtrinsicRefCodec implements TryDecode<ExtrinsicRef>, TryEncode<ExtrinsicRef> {
  static create(): ExtrinsicRefCodec {
    return new ExtrinsicRefCodec();
  }
  private constructor() {}

  decode(d: Decoder): Result<ExtrinsicRef, DecodeError> {
    const v = ExtrinsicRef.create(d.bytes32(), d.varU32());
    if (d.isError) return Result.err<ExtrinsicRef, DecodeError>(DecodeError.MissingBytes);
    return Result.ok<ExtrinsicRef, DecodeError>(v);
  }

  encode(v: ExtrinsicRef, e: Encoder): void {
    e.bytesFixLen(v.hash.raw);
    e.varU64(u64(v.length));
  }
}

export const extrinsicRefCodec: ExtrinsicRefCodec = ExtrinsicRefCodec.create();

// ─── WorkItem ─────────────────────────────────────────────────────────

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
}

export class WorkItemCodec implements TryDecode<WorkItem>, TryEncode<WorkItem> {
  static create(): WorkItemCodec {
    return new WorkItemCodec();
  }
  private constructor() {}

  decode(d: Decoder): Result<WorkItem, DecodeError> {
    const serviceId = d.u32();
    const codeHash = d.bytes32();
    const payload = d.bytesVarLen();
    const gasRefine = d.u64();
    const gasAccumulate = d.u64();
    const exportCount = d.varU32();
    if (d.isError) return Result.err<WorkItem, DecodeError>(DecodeError.MissingBytes);
    const imports = d.sequenceVarLen<ImportRef>(importRefCodec);
    if (imports.isError) return Result.err<WorkItem, DecodeError>(imports.error);
    const extrinsics = d.sequenceVarLen<ExtrinsicRef>(extrinsicRefCodec);
    if (extrinsics.isError) return Result.err<WorkItem, DecodeError>(extrinsics.error);
    return Result.ok<WorkItem, DecodeError>(
      WorkItem.create(
        serviceId,
        codeHash,
        payload,
        gasRefine,
        gasAccumulate,
        exportCount,
        imports.okay!,
        extrinsics.okay!,
      ),
    );
  }

  encode(v: WorkItem, e: Encoder): void {
    e.u32(v.serviceId);
    e.bytesFixLen(v.codeHash.raw);
    e.bytesVarLen(v.payload);
    e.u64(v.gasRefine);
    e.u64(v.gasAccumulate);
    e.varU64(u64(v.exportCount));
    e.sequenceVarLen<ImportRef>(importRefCodec, v.imports);
    e.sequenceVarLen<ExtrinsicRef>(extrinsicRefCodec, v.extrinsics);
  }
}

export const workItemCodec: WorkItemCodec = WorkItemCodec.create();

// ─── WorkPackage ──────────────────────────────────────────────────────

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
}

export class WorkPackageCodec implements TryDecode<WorkPackage>, TryEncode<WorkPackage> {
  static create(): WorkPackageCodec {
    return new WorkPackageCodec();
  }
  private constructor() {}

  decode(d: Decoder): Result<WorkPackage, DecodeError> {
    const authToken = d.bytesVarLen();
    const authServiceId = d.u32();
    const authCodeHash = d.bytes32();
    const authConfig = d.bytesVarLen();
    if (d.isError) return Result.err<WorkPackage, DecodeError>(DecodeError.MissingBytes);
    const ctx = d.object<RefinementContext>(refinementContextCodec);
    if (ctx.isError) return Result.err<WorkPackage, DecodeError>(ctx.error);
    const items = d.sequenceVarLen<WorkItem>(workItemCodec);
    if (items.isError) return Result.err<WorkPackage, DecodeError>(items.error);
    return Result.ok<WorkPackage, DecodeError>(
      WorkPackage.create(authToken, authServiceId, authCodeHash, authConfig, ctx.okay!, items.okay!),
    );
  }

  encode(v: WorkPackage, e: Encoder): void {
    e.bytesVarLen(v.authToken);
    e.u32(v.authServiceId);
    e.bytesFixLen(v.authCodeHash.raw);
    e.bytesVarLen(v.authConfig);
    e.object<RefinementContext>(refinementContextCodec, v.context);
    e.sequenceVarLen<WorkItem>(workItemCodec, v.workItems);
  }
}

export const workPackageCodec: WorkPackageCodec = WorkPackageCodec.create();
