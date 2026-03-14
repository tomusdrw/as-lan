import { Bytes32, BytesBlob } from "../bytes";

export interface TryEncode {
  encode(e: Encoder): void;
}

export class Encoder {
  /** Create a growable [`Encoder`] with the given initial capacity. */
  static create(initialCapacity: u32 = 64): Encoder {
    return new Encoder(new Uint8Array(initialCapacity), true);
  }

  /** Create a fixed-size [`Encoder`] that writes into the given buffer. */
  static into(buffer: Uint8Array): Encoder {
    return new Encoder(buffer, false);
  }

  private dataView: DataView;
  private offset: u32 = 0;
  private _isError: boolean = false;

  private constructor(
    private data: Uint8Array,
    private readonly growable: boolean,
  ) {
    this.dataView = new DataView(data.buffer, data.byteOffset, data.byteLength);
  }

  /** Whether writing has overflowed the buffer (fixed-size mode only). */
  get isError(): boolean {
    return this._isError;
  }

  /** Return the number of bytes written so far. */
  bytesWritten(): u32 {
    return this.offset;
  }

  /** Return the encoded bytes, trimmed to the actual length. */
  finish(): Uint8Array {
    return this.data.subarray(0, this.offset);
  }

  /** Return the encoded bytes wrapped as a BytesBlob. */
  finishBlob(): BytesBlob {
    return BytesBlob.wrap(this.finish());
  }

  /** Encode a single byte. */
  u8(value: u8): void {
    if (!this.ensureCapacity(1)) return;
    this.dataView.setUint8(this.offset, value);
    this.offset += 1;
  }

  /** Encode two bytes (little-endian). */
  u16(value: u16): void {
    if (!this.ensureCapacity(2)) return;
    this.dataView.setUint16(this.offset, value, true);
    this.offset += 2;
  }

  /** Encode 4 bytes (little-endian). */
  u32(value: u32): void {
    if (!this.ensureCapacity(4)) return;
    this.dataView.setUint32(this.offset, value, true);
    this.offset += 4;
  }

  /** Encode 8 bytes (little-endian). */
  u64(value: u64): void {
    if (!this.ensureCapacity(8)) return;
    this.dataView.setUint64(this.offset, value, true);
    this.offset += 8;
  }

  /**
   * Encode a natural number using variable-length encoding (up to 2**64).
   *
   * This is the inverse of `Decoder.varU64()`.
   */
  varU64(value: u64): void {
    if (value < 128) {
      this.u8(u8(value));
      return;
    }

    const l = encodeVariableLengthExtraBytes(value);

    if (l === 8) {
      if (!this.ensureCapacity(9)) return;
      this.dataView.setUint8(this.offset, 0xff);
      this.offset += 1;
      this.dataView.setUint64(this.offset, value, true);
      this.offset += 8;
      return;
    }

    if (!this.ensureCapacity(1 + l)) return;
    // First byte: prefix mask | high bits of value
    const shifted = value >> (8 * l);
    const prefix = u8(2 ** 8 - 2 ** (8 - l));
    this.dataView.setUint8(this.offset, prefix | u8(shifted));
    this.offset += 1;

    // Remaining l bytes: low bits, little-endian
    for (let i: u8 = 0; i < l; i += 1) {
      this.dataView.setUint8(this.offset, u8(value >> (8 * i)));
      this.offset += 1;
    }
  }

  /** Encode a 32-byte sequence. */
  bytes32(value: Bytes32): void {
    this.bytesFixLen(value.raw);
  }

  /** Encode a fixed-length sequence of bytes. */
  bytesFixLen(value: Uint8Array): void {
    const len = value.length;
    if (len === 0) {
      return;
    }
    if (!this.ensureCapacity(len)) return;
    this.data.set(value, this.offset);
    this.offset += len;
  }

  /** Encode a variable-length sequence of bytes (length-prefixed). */
  bytesVarLen(value: BytesBlob): void {
    this.varU64(u64(value.raw.length));
    this.bytesFixLen(value.raw);
  }

  /** Encode a composite object. */
  object(value: TryEncode): void {
    value.encode(this);
  }

  /** Encode a possibly optional value. */
  optional<T extends TryEncode>(value: T | null): void {
    if (value === null) {
      this.u8(0);
    } else {
      this.u8(1);
      value.encode(this);
    }
  }

  /** Encode a known-length sequence of elements. */
  sequenceFixLen<T extends TryEncode>(values: StaticArray<T>): void {
    for (let i: u32 = 0; i < <u32>values.length; i += 1) {
      values[i].encode(this);
    }
  }

  /** Encode a variable-length sequence of elements (length-prefixed). */
  sequenceVarLen<T extends TryEncode>(values: StaticArray<T>): void {
    this.varU64(u64(values.length));
    this.sequenceFixLen(values);
  }

  /**
   * Ensure the internal buffer has room for `bytes` more bytes.
   * Returns true if space is available, false if the buffer is full (fixed-size mode).
   */
  private ensureCapacity(bytes: u32): boolean {
    if (this._isError) {
      return false;
    }

    const required = this.offset + bytes;
    if (required <= <u32>this.data.length) {
      return true;
    }

    if (!this.growable) {
      this._isError = true;
      return false;
    }

    let newCapacity = <u32>this.data.length;
    while (newCapacity < required) {
      newCapacity *= 2;
    }

    const newData = new Uint8Array(newCapacity);
    newData.set(this.data.subarray(0, this.offset));
    this.data = newData;
    this.dataView = new DataView(newData.buffer, 0, newCapacity);
    return true;
  }
}

function encodeVariableLengthExtraBytes(value: u64): u8 {
  // Number of extra bytes needed beyond the first byte.
  // Each level l uses (8-l-1) value bits in the first byte + 8*l bits in extra bytes.
  // Total value capacity: 7*(l+1) bits.
  // l=1: < 2^14, l=2: < 2^21, ..., l=7: < 2^56, l=8: >= 2^56
  for (let l: u8 = 1; l <= 7; l += 1) {
    if (value < u64(1) << (7 * (l + 1))) {
      return l;
    }
  }
  return 8;
}
