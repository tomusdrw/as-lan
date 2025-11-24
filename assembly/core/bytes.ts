import { U8WithError, u8IsError, u8WithError } from "./pack";
import { Result } from "./result";

export enum BlobParseError {
  MissingPrefix = 0,
  InvalidNumberOfNibbles = 1,
  InvalidCharacters = 2,
}

export class BytesBlob {
  static parseBlob(v: string): Result<BytesBlob, BlobParseError> {
    if (v.startsWith("0x")) {
      return BytesBlob.parseBlobNoPrefix(v.substring(2));
    }
    return Result.err<BytesBlob, BlobParseError>(BlobParseError.MissingPrefix);
  }

  static parseBlobNoPrefix(v: string): Result<BytesBlob, BlobParseError> {
    const len = v.length;
    if (len % 2 === 1) {
      return Result.err<BytesBlob, BlobParseError>(BlobParseError.InvalidNumberOfNibbles);
    }

    const bytes = new Uint8Array(len / 2);
    for (let i = 0; i < len - 1; i += 2) {
      const c = v.substring(i, i + 2);
      const b = byteFromString(c);
      if (u8IsError(b)) {
        return Result.err<BytesBlob, BlobParseError>(BlobParseError.InvalidCharacters);
      }
      bytes[i / 2] = b;
    }

    return Result.ok<BytesBlob, BlobParseError>(new BytesBlob(bytes));
  }

  protected constructor(public readonly raw: Uint8Array) {}

  toString(): string {
    return bytesToHexString(this.raw);
  }
}

export class Bytes32 extends BytesBlob {
  protected constructor(data: Uint8Array) {
    if (data.length !== 32) {
      throw new Error(`Invalid length of bytes32 (got: ${data.length})`);
    }
    super(data);
  }
}

const CODE_OF_0: i32 = "0".charCodeAt(0);
const CODE_OF_9: i32 = "9".charCodeAt(0);
const CODE_OF_a: i32 = "a".charCodeAt(0);
const CODE_OF_f: i32 = "f".charCodeAt(0);
const CODE_OF_A: i32 = "A".charCodeAt(0);
const CODE_OF_F: i32 = "F".charCodeAt(0);
const VALUE_OF_A: i32 = 0xa;

function byteFromString(s: string): U8WithError {
  const a = numberFromCharCode(s.charCodeAt(0));
  const b = numberFromCharCode(s.charCodeAt(1));
  if (u8IsError(a) || u8IsError(b)) {
    return u8WithError(0, 0xff);
  }
  return (u8(a) << 4) | u8(b);
}

function numberFromCharCode(x: i32): u16 {
  if (x >= CODE_OF_0 && x <= CODE_OF_9) {
    return u16(x - CODE_OF_0);
  }

  if (x >= CODE_OF_a && x <= CODE_OF_f) {
    return u16(x - CODE_OF_a + VALUE_OF_A);
  }

  if (x >= CODE_OF_A && x <= CODE_OF_F) {
    return u16(x - CODE_OF_A + VALUE_OF_A);
  }

  return u8WithError(0, 0xff);
}

function bytesToHexString(buffer: Uint8Array): string {
  const nibbleToString = (n: i32): string => {
    if (n >= VALUE_OF_A) {
      return String.fromCharCode(n + CODE_OF_a - VALUE_OF_A);
    }
    return String.fromCharCode(n + CODE_OF_0);
  };

  let s = "0x";
  for (let i = 0; i < buffer.length; i++) {
    const v = buffer[i];
    s += nibbleToString(v >>> 4);
    s += nibbleToString(v & 0xf);
  }
  return s;
}
