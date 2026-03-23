import { Bytes32, BytesBlob } from "../bytes";
import { Result } from "../result";

export enum DecodeError {
  /** Not enough bytes in the buffer to decode request data. */
  MissingBytes = 0,
  /** Collection would be too large to decode. */
  TooLarge,
  /** Invalid discriminator tag or value out of expected range. */
  InvalidData,
}

/**
 * Interface for types that can decode a value from a [`Decoder`].
 *
 * Prefer implementing this on a dedicated codec class rather than
 * on the data type directly. See [`TryEncode`] for an example.
 */
export interface TryDecode<T> {
  decode(d: Decoder): Result<T, DecodeError>;
}

export class Decoder {
  /**
   * Create a new [`Decoder`] instance given a raw array of bytes as a source.
   */
  static fromBlob(source: Uint8Array): Decoder {
    return new Decoder(source);
  }

  private readonly dataView: DataView;
  private _isError: boolean = false;

  private constructor(
    public readonly source: Uint8Array,
    private offset: u32 = 0,
  ) {
    this.dataView = new DataView(source.buffer, source.byteOffset, source.byteLength);
  }

  /**
   * If the decoder turns into error state, the last value was not decoded properly
   * and might be garbage.
   */
  get isError(): boolean {
    return this._isError;
  }

  /**
   * Return a copy of this decoder.
   *
   * The copy will maintain it's own `offset` within the source.
   */
  clone(): Decoder {
    return new Decoder(this.source, this.offset);
  }

  /**
   * Return the number of bytes read from the source
   * (i.e. current offset within the source).
   */
  bytesRead(): u32 {
    return this.offset;
  }

  /** Decode single byte as an unsigned number. */
  u8(): u8 {
    const offset = this.moveOffset(1);
    if (offset !== -1) {
      return this.dataView.getUint8(offset);
    }
    return 0;
  }

  /** Decode two bytes as an unsigned number. */
  u16(): u16 {
    const offset = this.moveOffset(2);
    if (offset !== -1) {
      return this.dataView.getUint16(offset, true);
    }
    return 0;
  }

  /** Decode 4 bytes as an unsigned number. */
  u32(): u32 {
    const offset = this.moveOffset(4);
    if (offset !== -1) {
      return this.dataView.getUint32(offset, true);
    }
    return 0;
  }

  /** Decode 8 bytes as a unsigned number. */
  u64(): u64 {
    const offset = this.moveOffset(8);
    if (offset !== -1) {
      return this.dataView.getUint64(offset, true);
    }
    return 0;
  }

  /**
   * Decode a variable-length u64 and validate it fits in a u32.
   * Sets isError if the value overflows u32 range.
   */
  varU32(): u32 {
    const val = this.varU64();
    if (val > 0xffff_ffff) {
      this._isError = true;
      return 0;
    }
    return u32(val);
  }

  /**
   * Decode a variable-length encoding of natural numbers (up to 2**64).
   */
  varU64(): u64 {
    let offset = this.moveOffset(1);
    if (offset === -1) {
      return 0;
    }

    const firstByte = this.source[offset];
    const l = decodeVariableLengthExtraBytes(firstByte);

    if (l === 0) {
      return u64(firstByte);
    }

    offset = this.moveOffset(l);
    if (offset === -1) {
      return 0;
    }

    if (l === 8) {
      return this.dataView.getUint64(offset, true);
    }

    let num = (u64(firstByte) + 2 ** (8 - l) - 2 ** 8) << (8 * l);
    for (let i = 0; i < <i32>l; i += 1) {
      num |= u64(this.source[offset + i]) << (8 * i);
    }
    return num;
  }

  /** Decode a 32-byte sequence. */
  bytes32(): Bytes32 {
    const bytes = this.bytesFixLen(32);
    return Bytes32.wrapUnchecked(bytes.raw);
  }

  /**
   * Decode a fixed-length sequence of bytes.
   *
   * NOTE: this method may return an empty blob in case there is a decoding error.
   * We don't return a `Result` here to allow simpler handling of the error state
   * via just single `isError` check at the very end.
   **/
  bytesFixLen(len: u32): BytesBlob {
    if (len === 0) {
      return BytesBlob.empty();
    }
    const offset = this.moveOffset(len);
    if (offset === -1) {
      // Return empty blob on error — avoid allocating attacker-controlled len.
      // Callers like bytes32() / bytesVarLen() should check isError.
      return BytesBlob.wrap(new Uint8Array(0));
    }

    const bytes = this.source.subarray(offset, offset + len);
    return BytesBlob.wrap(bytes);
  }

  /**
   * Decode a variable-length sequence of bytes.
   *
   * NOTE: this method may return an empty blob in case there is a decoding error
   * We don't return a `Result` here to allow simpler handling of the error state
   * via just single `isError` check at the very end.
   */
  bytesVarLen(): BytesBlob {
    // TODO [ToDr] limit large collections?
    const len = this.varU32();
    return this.bytesFixLen(len);
  }

  /** Decode a composite object. */
  object<T>(decode: TryDecode<T>): Result<T, DecodeError> {
    return decode.decode(this);
  }

  /** Decode a possibly optional value. */
  optional<T>(decode: TryDecode<T>): Result<T | null, DecodeError> {
    const presenceByte = this.u8();
    if (this._isError) {
      return Result.err<T | null, DecodeError>(DecodeError.MissingBytes);
    }
    if (presenceByte === 0) {
      return Result.ok<T | null, DecodeError>(null);
    }
    // NOTE [ToDr] we don't detect non-canonical data here to to save few bytes
    const result = decode.decode(this);
    if (result.isOkay) {
      return Result.ok<T | null, DecodeError>(result.okay!);
    }
    return Result.err<T | null, DecodeError>(result.error);
  }

  /** Decode a known-length sequence of elements. */
  sequenceFixLen<T>(decode: TryDecode<T>, len: u32): Result<StaticArray<T>, DecodeError> {
    const result = new StaticArray<T>(len);
    for (let i: u32 = 0; i < len; i += 1) {
      const v = decode.decode(this);
      if (v.isOkay) {
        result[i] = v.okay!;
      } else {
        return Result.err<StaticArray<T>, DecodeError>(v.error);
      }
    }
    return Result.ok<StaticArray<T>, DecodeError>(result);
  }

  /** Decode a variable-length sequence of elements. */
  sequenceVarLen<T>(decode: TryDecode<T>): Result<StaticArray<T>, DecodeError> {
    const rawLen = this.varU64();
    if (this._isError) {
      return Result.err<StaticArray<T>, DecodeError>(DecodeError.MissingBytes);
    }
    if (rawLen > 0xffff_ffff) {
      this._isError = true;
      return Result.err<StaticArray<T>, DecodeError>(DecodeError.TooLarge);
    }
    return this.sequenceFixLen<T>(decode, u32(rawLen));
  }

  /**
   * Move the decoding cursor to given offset.
   *
   * Note the offset can actually be smaller than the current offset
   * (i.e. one can go back).
   */
  resetTo(newOffset: u32): void {
    if (this.offset < newOffset) {
      this.skip(newOffset - this.offset);
    } else {
      this.offset = newOffset;
    }
  }

  /** Skip given number of bytes for decoding. */
  skip(bytes: u32): boolean {
    return this.moveOffset(bytes) !== -1;
  }

  /**
   * Finish decoding `source` object and make sure there is no data left.
   *
   * This method can be called when the entire object that was meant to be
   * stored in the `source` is now fully decoded and we want to ensure
   * that there is no extra bytes contained in the `source`.
   */
  isFinished(): boolean {
    // TODO [ToDr] set isError?
    return this.offset === this.source.length;
  }

  // Progress the offset, but return the previous offset or -1 if not enough bytes.
  private moveOffset(bytes: u32): u32 {
    if (this.hasBytes(bytes)) {
      const currentOffset = this.offset;
      this.offset += bytes;
      return currentOffset;
    }
    this._isError = true;
    return -1;
  }

  private hasBytes(bytes: u32): boolean {
    return bytes <= <u32>this.source.length - this.offset;
  }
}

const MASKS: u8[] = [0xff, 0xfe, 0xfc, 0xf8, 0xf0, 0xe0, 0xc0, 0x80];

function decodeVariableLengthExtraBytes(firstByte: u8): u8 {
  for (let i: u8 = 0; i < <u8>MASKS.length; i++) {
    if (firstByte >= MASKS[i]) {
      return 8 - i;
    }
  }
  return 0;
}
