import { Bytes32 } from "../bytes";
import { Result } from "../result";
import { DecodeError, Decoder, TryDecode } from "./decode";
import { Encoder, TryEncode } from "./encode";

/** Codec for Bytes32 (32-byte fixed-length hash). */
export class Bytes32Codec implements TryDecode<Bytes32>, TryEncode<Bytes32> {
  static create(): Bytes32Codec {
    return new Bytes32Codec();
  }

  private constructor() {}

  decode(d: Decoder): Result<Bytes32, DecodeError> {
    const v = d.bytes32();
    if (d.isError) return Result.err<Bytes32, DecodeError>(DecodeError.MissingBytes);
    return Result.ok<Bytes32, DecodeError>(v);
  }

  encode(value: Bytes32, e: Encoder): void {
    e.bytesFixLen(value.raw);
  }
}
