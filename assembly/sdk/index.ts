import {BytesBlob} from "../core/bytes";
import {Decoder, BytesBlobCodec } from "../core/codec";
import {AccumulateItem, PackageInfo} from "../jam/types";
import {accumulate, refine} from "./service";

export function refine_ext(inData: Uint8Array): Uint8Array {
  const decoder = Decoder.fromBlob(inData);
  const serviceId = decoder.u32();
  const payload = decoder.bytesVarLen();
  const packageInfo = decoder.object<PackageInfo>(PackageInfo.Codec);
  const extrinsics = decoder.sequenceVarLen<BytesBlob>(BytesBlobCodec)

  const output = refine(serviceId, payload, packageInfo.okay!, extrinsics.okay!)

  return output.raw;
}

export function accumulate_ext(inData: Uint8Array): Uint8Array {
  const decoder = Decoder.fromBlob(inData);
  const slot = decoder.u32();
  const serviceId = decoder.u32();
  const refineResults = decoder.sequenceVarLen<AccumulateItem>(AccumulateItem.Codec)

  const output = accumulate(slot, serviceId, refineResults.okay!);

  // TODO [ToDr] encode option?
  return output.isSome ? output.val!.raw : new Uint8Array(0);
}
