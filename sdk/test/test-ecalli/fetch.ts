// @ts-expect-error: decorator
@external("ecalli", "setFetchData")
declare function _setFetchData(ptr: u32, len: u32): void;

/** Configure the fetch() stub to return fixed data (regardless of kind). */
export class TestFetch {
  static setData(data: Uint8Array): void {
    _setFetchData(u32(data.dataStart), data.byteLength);
  }
}
