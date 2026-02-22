import {BytesBlob} from "../core/bytes";
import {Decoder, BytesBlobCodec } from "../core/codec";
import {AccumulateItem, CodeHash, PackageInfo} from "../jam/types";
import {Optional} from "../core/result";
import {accumulate, refine} from "./service";

function ensureDecodeOk(decoder: Decoder): void {
  if (decoder.isError || !decoder.isFinished()) {
    throw new Error("Invalid ABI payload");
  }
}

function encodeOptionalCodeHash(hash: Optional<CodeHash>): Uint8Array {
  if (!hash.isSome) {
    return new Uint8Array(1);
  }

  const out = new Uint8Array(33);
  out[0] = 1;
  out.set(hash.val!.raw, 1);
  return out;
}

export function refine_ext(inData: Uint8Array): Uint8Array {
  const decoder = Decoder.fromBlob(inData);
  const serviceId = decoder.u32();
  const payload = decoder.bytesVarLen();
  const packageInfo = decoder.object<PackageInfo>(PackageInfo.Codec);
  const extrinsics = decoder.sequenceVarLen<BytesBlob>(BytesBlobCodec);

  if (!packageInfo.isOkay || !extrinsics.isOkay) {
    throw new Error("Invalid ABI payload");
  }
  ensureDecodeOk(decoder);

  const output = refine(serviceId, payload, packageInfo.okay!, extrinsics.okay!);

  return output.raw;
}

export function accumulate_ext(inData: Uint8Array): Uint8Array {
  const decoder = Decoder.fromBlob(inData);
  const slot = decoder.u32();
  const serviceId = decoder.u32();
  const refineResults = decoder.sequenceVarLen<AccumulateItem>(AccumulateItem.Codec);

  if (!refineResults.isOkay) {
    throw new Error("Invalid ABI payload");
  }
  ensureDecodeOk(decoder);

  const output = accumulate(slot, serviceId, refineResults.okay!);
  return encodeOptionalCodeHash(output);
}
