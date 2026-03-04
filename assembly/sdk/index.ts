import { Decoder } from "../core/codec";
import { Optional } from "../core/result";
import { CodeHash } from "../jam/types";
import { accumulate, refine } from "./service";

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
  const coreIndex = u16(decoder.varU64());
  const itemIndex = u32(decoder.varU64());
  const serviceId = u32(decoder.varU64());
  const payload = decoder.bytesVarLen();
  const workPackageHash = decoder.bytes32();

  ensureDecodeOk(decoder);

  const output = refine(coreIndex, itemIndex, serviceId, payload, workPackageHash);

  return output.raw;
}

export function accumulate_ext(inData: Uint8Array): Uint8Array {
  const decoder = Decoder.fromBlob(inData);
  const slot = u32(decoder.varU64());
  const serviceId = u32(decoder.varU64());
  const argsLength = u32(decoder.varU64());

  ensureDecodeOk(decoder);

  const output = accumulate(slot, serviceId, argsLength);
  return encodeOptionalCodeHash(output);
}
