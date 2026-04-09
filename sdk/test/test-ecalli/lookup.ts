// @ts-expect-error: decorator
@external("ecalli", "setLookupPreimage")
declare function _setLookupPreimage(ptr: u32, len: u32): void;

// @ts-expect-error: decorator
@external("ecalli", "setLookupNone")
declare function _setLookupNone(): void;

/** Configure the lookup() stub. */
export class TestLookup {
  /** Set preimage data returned by lookup(). */
  static setPreimage(data: Uint8Array): void {
    _setLookupPreimage(u32(data.dataStart), data.byteLength);
  }

  /** Make lookup() return NONE (preimage not found). */
  static setNone(): void {
    _setLookupNone();
  }
}
