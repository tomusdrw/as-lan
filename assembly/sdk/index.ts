import { Decoder } from "../core/codec";
import { Optional } from "../core/result";
import { CodeHash } from "../jam/types";
import { accumulate, refine } from "./service";

function ensureDecodeOk(decoder: Decoder): void {
  if (decoder.isError || !decoder.isFinished()) {
    throw new Error("Invalid ABI payload");
  }
}

function strictU16(val: u64): u16 {
  if (val > 0xffff) {
    throw new Error("ABI value exceeds u16 range");
  }
  return u16(val);
}

function strictU32(val: u64): u32 {
  if (val > 0xffff_ffff) {
    throw new Error("ABI value exceeds u32 range");
  }
  return u32(val);
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
  const coreIndex = strictU16(decoder.varU64());
  const itemIndex = strictU32(decoder.varU64());
  const serviceId = strictU32(decoder.varU64());
  const payload = decoder.bytesVarLen();
  const workPackageHash = decoder.bytes32();

  ensureDecodeOk(decoder);

  const output = refine(coreIndex, itemIndex, serviceId, payload, workPackageHash);

  return output.raw;
}

export function accumulate_ext(inData: Uint8Array): Uint8Array {
  const decoder = Decoder.fromBlob(inData);
  const slot = strictU32(decoder.varU64());
  const serviceId = strictU32(decoder.varU64());
  const argsLength = strictU32(decoder.varU64());

  ensureDecodeOk(decoder);

  const output = accumulate(slot, serviceId, argsLength);
  return encodeOptionalCodeHash(output);
}
