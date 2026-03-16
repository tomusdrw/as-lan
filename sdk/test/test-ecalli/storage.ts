import { BytesBlob } from "../../core/bytes";

// @ts-expect-error: decorator
@external("ecalli", "setStorageEntry")
declare function _setStorageEntry(keyPtr: u32, keyLen: u32, valPtr: u32, valLen: u32): void;

/** Configure the read()/write() stub storage. */
export class TestStorage {
  /** Set or delete a storage entry. Pass null to delete. */
  static set(key: BytesBlob, value: BytesBlob | null): void {
    if (value === null) {
      _setStorageEntry(u32(key.raw.dataStart), key.raw.byteLength, 0, u32.MAX_VALUE);
    } else {
      _setStorageEntry(
        u32(key.raw.dataStart),
        key.raw.byteLength,
        u32(value.raw.dataStart),
        value.raw.byteLength,
      );
    }
  }
}
