// @ts-expect-error: decorator
@external("ecalli", "setFetchData")
declare function _setFetchData(ptr: u32, len: u32): void;

// @ts-expect-error: decorator
@external("ecalli", "setFetchDataForKind")
declare function _setFetchDataForKind(kind: u32, ptr: u32, len: u32): void;

/** Configure the fetch() stub to return fixed data. */
export class TestFetch {
  /** Set data returned for all fetch kinds (fallback). */
  static setData(data: Uint8Array): void {
    _setFetchData(u32(data.dataStart), data.byteLength);
  }

  /** Set data returned for a specific fetch kind. */
  static setDataForKind(kind: u32, data: Uint8Array): void {
    _setFetchDataForKind(kind, u32(data.dataStart), data.byteLength);
  }
}
