import { BytesBlob } from "./core/bytes";
import { Decoder } from "./core/codec";
import { readFromMemory } from "./core/mem";
import { Optional, Result } from "./core/result";
import { CodeHash, CoreIndex, ServiceId, Slot, WorkPackageHash } from "./jam/types";

export class RefineArgs {
  constructor(
    public coreIndex: CoreIndex,
    public itemIndex: u32,
    public serviceId: ServiceId,
    public payload: BytesBlob,
    public workPackageHash: WorkPackageHash,
  ) {}

  /** Parse raw refine arguments from (ptr, len). Returns a Result. */
  static parse(ptr: u32, len: u32): Result<RefineArgs, string> {
    const inData = readFromMemory(ptr, len);
    const decoder = Decoder.fromBlob(inData);
    const coreIndex = decoder.varU64();
    if (coreIndex > 0xffff) {
      return Result.err<RefineArgs, string>("coreIndex exceeds u16 range");
    }
    const itemIndex = decoder.varU64();
    if (itemIndex > 0xffff_ffff) {
      return Result.err<RefineArgs, string>("itemIndex exceeds u32 range");
    }
    const serviceId = decoder.varU64();
    if (serviceId > 0xffff_ffff) {
      return Result.err<RefineArgs, string>("serviceId exceeds u32 range");
    }
    const payload = decoder.bytesVarLen();
    const workPackageHash = decoder.bytes32();
    if (decoder.isError) {
      return Result.err<RefineArgs, string>("Decode error in refine ABI payload");
    }
    if (!decoder.isFinished()) {
      return Result.err<RefineArgs, string>("Unexpected trailing bytes in refine ABI payload");
    }
    return Result.ok<RefineArgs, string>(
      new RefineArgs(u16(coreIndex), u32(itemIndex), u32(serviceId), payload, workPackageHash),
    );
  }
}

export class AccumulateArgs {
  constructor(
    public slot: Slot,
    public serviceId: ServiceId,
    public argsLength: u32,
  ) {}

  /** Parse raw accumulate arguments from (ptr, len). Returns a Result. */
  static parse(ptr: u32, len: u32): Result<AccumulateArgs, string> {
    const inData = readFromMemory(ptr, len);
    const decoder = Decoder.fromBlob(inData);
    const slot = decoder.varU64();
    if (slot > 0xffff_ffff) {
      return Result.err<AccumulateArgs, string>("slot exceeds u32 range");
    }
    const serviceId = decoder.varU64();
    if (serviceId > 0xffff_ffff) {
      return Result.err<AccumulateArgs, string>("serviceId exceeds u32 range");
    }
    const argsLength = decoder.varU64();
    if (argsLength > 0xffff_ffff) {
      return Result.err<AccumulateArgs, string>("argsLength exceeds u32 range");
    }
    if (decoder.isError) {
      return Result.err<AccumulateArgs, string>("Decode error in accumulate ABI payload");
    }
    if (!decoder.isFinished()) {
      return Result.err<AccumulateArgs, string>("Unexpected trailing bytes in accumulate ABI payload");
    }
    return Result.ok<AccumulateArgs, string>(new AccumulateArgs(u32(slot), u32(serviceId), u32(argsLength)));
  }
}

// Result encoders

/** Encode an Optional<CodeHash> as bytes and pack into u64. */
export function encodeOptionalCodeHash(hash: Optional<CodeHash>): BytesBlob {
  if (!hash.isSome) {
    return BytesBlob.wrap(new Uint8Array(1));
  }

  const out = new Uint8Array(33);
  out[0] = 1;
  out.set(hash.val!.raw, 1);
  return BytesBlob.wrap(out);
}
