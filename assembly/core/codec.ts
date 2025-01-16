import {Blob, Bytes32} from "./bytes";

export interface Decode<T> {
  decode(t: Decoder): T;
};

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
  bytesRead(): number {
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
    const offset = this.moveOffset(4);
    if (offset !== -1) {
      return this.dataView.getUint64(offset, true);
    }
    return 0;
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
    if (l === 8) {
      return this.dataView.getUint64(offset, true);
    }

    let num = (u64(firstByte) + 2 ** (8 - l) - 2 ** 8) << (8 * l);
    for (let i = 0; i < l; i += 1) {
      num |= u64(this.source[offset + i]) << (8 * i);
    }
    return num;
  }

  /** Decode a 32-byte sequence. */
  bytes32(): Bytes32 {
    const bytes = this.bytesFixLen(32);
    return new Bytes32(bytes.data);
  }

  /** Decode a fixed-length sequence of bytes. */
  bytesFixLen(len: u32): Blob {
    if (len === 0) {
      return new Blob(new Uint8Array(0));
    }
    const offset = this.moveOffset(len);
    if (offset === -1) {
      // TODO [ToDr] we probably should not allocate here?
      return new Blob(new Uint8Array(len));
    }

    const bytes = this.source.subarray(offset, offset + len);
    return new Blob(bytes);
  }

  /** Decode a variable-length sequence of bytes. */
  bytesVarLen(): Blob {
    // TODO [ToDr] limit large collections?
    const len = this.varU64();
    return this.bytesFixLen(len);
  }

  /** Decode a composite object. */
  object<T>(decode: Decode<T>): T {
    return decode.decode(this);
  }


  /** Decode a possibly optional value. */
  optional<T>(decode: Decode<T>): T | null {
    // TODO [ToDr] handle non-canonical different than `1` value?
    const isSet = this.u8() !== 0;
    if (!isSet) {
      return null;
    }
    return decode.decode(this);
  }
  
  /** Decode a known-length sequence of elements. */
  sequenceFixLen<T>(decode: Decode<T>, len: number): StaticArray<T> {
    const result = new StaticArray<T>(len);
    for (let i = 0; i < len; i += 1) {
      result[i] = decode.decode(this);
    }
    return result;
  }

  /** Decode a variable-length sequence of elements. */
  sequenceVarLen<T>(decode: Decode<T>): StaticArray<T> {
    // TODO [ToDr] limit large collections?
    const len = this.varU64();
    return this.sequenceFixLen(decode, len);
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
  finish(): void {
    // TODO [ToDr] no errors
    if (this.offset < this.source.length) {
      throw new Error(`Expecting end of input, yet there are still ${this.source.length - this.offset} bytes left.`);
    }
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

  private hasBytes(bytes: u8): boolean {
    if (this.offset + bytes > this.source.length) {
      console.log(
        `Attempting to decode more data than there is left. Need ${bytes}, left: ${this.source.length - this.offset}.`,
      );
      return false;
    }
    return true;
  }
}

const MASKS: u8[] = [0xff, 0xfe, 0xfc, 0xf8, 0xf0, 0xe0, 0xc0, 0x80];

export function decodeVariableLengthExtraBytes(firstByte: u8): u8 {
  for (let i: u8 = 0; i < MASKS.length; i++) {
    if (firstByte >= MASKS[i]) {
      return 8 - i;
    }
  }
  return 0;
}