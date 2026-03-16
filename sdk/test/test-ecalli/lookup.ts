// @ts-expect-error: decorator
@external("ecalli", "setLookupPreimage")
declare function _setLookupPreimage(ptr: u32, len: u32): void;

/** Configure the lookup() stub to return a specific preimage. */
export class TestLookup {
  static setPreimage(data: Uint8Array): void {
    _setLookupPreimage(u32(data.dataStart), data.byteLength);
  }
}
