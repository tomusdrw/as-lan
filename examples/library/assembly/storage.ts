import {
  Bytes32,
  BytesBlob,
  DecodeError,
  Decoder,
  Encoder,
  Result,
  TryDecode,
  TryEncode,
} from "@fluffylabs/as-lan";

/** Storage value for a library mapping: preimage hash + its length. */
export class LibraryEntry {
  static create(hash: Bytes32, length: u32): LibraryEntry {
    return new LibraryEntry(hash, length);
  }

  private constructor(
    public readonly hash: Bytes32,
    public readonly length: u32,
  ) {}
}

export class LibraryEntryCodec implements TryDecode<LibraryEntry>, TryEncode<LibraryEntry> {
  static create(): LibraryEntryCodec {
    return new LibraryEntryCodec();
  }

  private constructor() {}

  encode(value: LibraryEntry, e: Encoder): void {
    e.bytesFixLen(value.hash.bytes);
    e.u32(value.length);
  }

  decode(d: Decoder): Result<LibraryEntry, DecodeError> {
    const hashBytes = d.bytesFixLen(32);
    if (d.isError) return Result.err<LibraryEntry, DecodeError>(DecodeError.MissingBytes);
    const hash = Bytes32.wrapUnchecked(hashBytes.raw);
    const length = d.u32();
    if (d.isError) return Result.err<LibraryEntry, DecodeError>(DecodeError.MissingBytes);
    return Result.ok<LibraryEntry, DecodeError>(LibraryEntry.create(hash, length));
  }
}

/** Build the storage key `"lib:<name>"` as ASCII bytes. */
export function libraryKey(name: string): Uint8Array {
  return BytesBlob.encodeAscii(`lib:${name}`).raw;
}
