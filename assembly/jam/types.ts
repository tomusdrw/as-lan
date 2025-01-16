import { Bytes32 } from "../core/bytes";
import { Decoder } from "../core/codec";
import { Optional } from "../core/result";

// keccak256
export type MmrPeakHash = Bytes32;
// blake2b
export type StateRootHash = Bytes32;
// blake2b
export type HeaderHash = Bytes32;

export type Slot = u32;
export type ServiceId = u32;
export type WorkPayload = u8[];

export type WorkPackageHash = Bytes32;

export class RefineContext {
  constructor(
    public readonly anchor: HeaderHash,
    public readonly stateRoot: StateRootHash,
    public readonly beefyRoot: MmrPeakHash,
    public readonly lookupAnchor: HeaderHash,
    public readonly lookupAnchorSlot: Slot,
    public readonly prerequisites: StaticArray<WorkPackageHash>, // should be VecSet?
  ) {}

  static decode(d: Decoder): Optional<RefineContext> {
    const anchor = d.bytes32();
    const stateRoot = d.bytes32();
    const beefyRoot = d.bytes32();
    const lookupAnchor = d.bytes32();
    const lookupAnchorSlot = d.u32();
    const prerequisites = d.sequenceVarLen({
      decode: (t: Decoder): Bytes32 => t.bytes32(),
    });

    if (d.isError) {
      return Optional.none();
    }

    return Optional.some(
      new RefineContext(anchor, stateRoot, beefyRoot, lookupAnchor, lookupAnchorSlot, prerequisites),
    );
  }
}

export class PackageInfo {
  packageHash!: WorkPackageHash;
  context!: RefineContext;
}
