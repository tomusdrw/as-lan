import { Bytes32, BytesBlob } from "../core/bytes";
import { DecodeError, Decoder, TryDecode, ClassCodec } from "../core/codec";
import { Result } from "../core/result";

// keccak256
export type MmrPeakHash = Bytes32;
// blake2b
export type StateRootHash = Bytes32;
// blake2b
export type HeaderHash = Bytes32;
// blake2b
export type CodeHash = Bytes32;
// blake2b
export type PayloadHash = Bytes32;

export type Slot = u32;
export type ServiceId = u32;
export type WorkPayload = BytesBlob;
export type AuthOutput = BytesBlob;
export type WorkOutput = BytesBlob;

export type WorkPackageHash = Bytes32;

export enum WorkExecResultKind {
  OK = 0,
  OutOfGas = 1,
  Panic = 2,
  BadExports = 3,
  BadCode = 4,
  CodeOversize = 5,
}

export class RefineContext {
  constructor(
    public readonly anchor: HeaderHash,
    public readonly stateRoot: StateRootHash,
    public readonly beefyRoot: MmrPeakHash,
    public readonly lookupAnchor: HeaderHash,
    public readonly lookupAnchorSlot: Slot,
    public readonly prerequisites: StaticArray<WorkPackageHash>, // should be VecSet?
  ) {}

  static Codec: TryDecode<RefineContext> = new ClassCodec<RefineContext>((d) => {
    const anchor = d.bytes32();
    const stateRoot = d.bytes32();
    const beefyRoot = d.bytes32();
    const lookupAnchor = d.bytes32();
    const lookupAnchorSlot = d.u32();
    // TODO [ToDr] Always ok decode for simpler signature?
    const prerequisites = d.sequenceVarLen<Bytes32>(
      new ClassCodec<Bytes32>(
        (t: Decoder): Result<Bytes32, DecodeError> => Result.ok<Bytes32, DecodeError>(t.bytes32()),
      ),
    );

    if (d.isError) {
      return Result.err<RefineContext, DecodeError>(DecodeError.Invalid);
    }

    // we know there was no error, so we can safely cast here.
    const prereq = prerequisites.okay!;
    return Result.ok<RefineContext, DecodeError>(
      new RefineContext(anchor, stateRoot, beefyRoot, lookupAnchor, lookupAnchorSlot, prereq),
    );
  });
}

export class PackageInfo {
  static Codec: TryDecode<PackageInfo> = new ClassCodec<PackageInfo>((d) => {
    const packageHash = d.bytes32();
    const refineContext = d.object<RefineContext>(RefineContext.Codec);

    if (d.isError) {
      return Result.err<PackageInfo, DecodeError>(DecodeError.Invalid);
    }
    // we know there was no error, so we can safely cast here.
    const refContext = refineContext.okay!;
    return Result.ok<PackageInfo, DecodeError>(new PackageInfo(packageHash, refContext));
  });

  constructor(
    public readonly packageHash: WorkPackageHash,
    public readonly context: RefineContext,
  ) {}
}

export class ImportSpec {
  static Codec: TryDecode<ImportSpec> = new ClassCodec<ImportSpec>((d) => {
    const treeRoot = d.bytes32();
    const index = d.u16();

    if (d.isError) {
      return Result.err<ImportSpec, DecodeError>(DecodeError.Invalid);
    }
    return Result.ok<ImportSpec, DecodeError>(new ImportSpec(treeRoot, index));
  });

  constructor(
    /**
     * ??: TODO [ToDr] GP seems to mention a identity of a work-package:
     * https://graypaper.fluffylabs.dev/#/c71229b/195500195500
     */
    public readonly treeRoot: Bytes32,
    /** Index of the prior exported segment. */
    public readonly index: u16,
  ) {}
}

export class WorkItemExtrinsicSpec {
  static Codec: TryDecode<WorkItemExtrinsicSpec> = new ClassCodec<WorkItemExtrinsicSpec>((d) => {
    const hash = d.bytes32();
    const len = d.u32();
    if (d.isError) {
      return Result.err<WorkItemExtrinsicSpec, DecodeError>(DecodeError.Invalid);
    }
    return Result.ok<WorkItemExtrinsicSpec, DecodeError>(new WorkItemExtrinsicSpec(hash, len));
  });

  constructor(
    /** The pre-image to this hash should be passed to the guarantor alongisde the work-package. */
    public readonly hash: Bytes32,
    /** Length of the preimage identified by the hash above. */
    public readonly len: u32,
  ) {}
}

export class WorkItem {
  static Codec: TryDecode<WorkItem> = new ClassCodec<WorkItem>((d) => {
    const serviceId = d.u32();
    const codeHash = d.bytes32();
    const payload = d.bytesVarLen();
    const refineGasLimit = d.u64();
    const accumulateGasLimit = d.u64();
    const importSegments = d.sequenceVarLen<ImportSpec>(ImportSpec.Codec);
    const extrinsic = d.sequenceVarLen<WorkItemExtrinsicSpec>(WorkItemExtrinsicSpec.Codec);
    const exportCount = d.u16();

    if (d.isError) {
      return Result.err<WorkItem, DecodeError>(DecodeError.Invalid);
    }

    // we know there was no error, so we can safely cast here.
    const imports = importSegments.okay!;
    const specs = extrinsic.okay!;
    return Result.ok<WorkItem, DecodeError>(
      new WorkItem(serviceId, codeHash, payload, refineGasLimit, accumulateGasLimit, imports, specs, exportCount),
    );
  });

  constructor(
    /** `s`: related service */
    public readonly service: ServiceId,
    /**
     * `c`: code hash of the service at the time of reporting.
     *
     * preimage of that hash must be available from the perspective of the lookup
     * anchor block.
     */
    public readonly codeHash: CodeHash,
    /** `y`: payload blob */
    public readonly payload: BytesBlob,
    /** `g`: refine execution gas limit */
    public readonly refineGasLimit: u64,
    /** `a`: accumulate execution gas limit */
    public readonly accumulateGasLimit: u64,
    /** `i`: sequence of imported data segments, which identify a prior exported segment. */
    public readonly importSegments: StaticArray<ImportSpec>,
    /** `x`: sequence of blob hashes and lengths to be introduced in this block */
    public readonly extrinsic: StaticArray<WorkItemExtrinsicSpec>,
    /** `e`: number of data segments exported by this work item. */
    public readonly exportCount: u16,
  ) {}
}

export class WorkExecResult {
  static Codec: TryDecode<WorkExecResult> = new ClassCodec<WorkExecResult>((d) => {
    const kind = d.u8();
    let okBlob: BytesBlob | null = null;
    if (kind === 0) {
      okBlob = d.bytesVarLen();
    }

    if (d.isError) {
      return Result.err<WorkExecResult, DecodeError>(DecodeError.Invalid);
    }

    return Result.ok<WorkExecResult, DecodeError>(new WorkExecResult(
      kind,
      okBlob,
    ));
  });

  constructor(
    public readonly kind: WorkExecResultKind,
    public readonly okBlob: BytesBlob | null = null,
  ) {}
} 

export class AccumulateItem {
  static Codec: TryDecode<AccumulateItem> = new ClassCodec<AccumulateItem>((d) => {
    const workPackage = d.bytes32();
    const authOutput = d.bytesVarLen();
    const payloadHash = d.bytes32();
    const workExecResult = d.object<WorkExecResult>(WorkExecResult.Codec);

    if (d.isError) {
      return Result.err<AccumulateItem, DecodeError>(DecodeError.Invalid);
    }

    return Result.ok<AccumulateItem, DecodeError>(new AccumulateItem(
      workPackage,
      authOutput,
      payloadHash,
      workExecResult.okay!,
    ));
  });

  constructor(
    public readonly workPackage: WorkPackageHash,
    public readonly authOutput: AuthOutput,
    public readonly payload: PayloadHash,
    public readonly workExecResult: WorkExecResult,
  ) {}
}

// export class TransferRecord
