// @ts-expect-error: decorator
@external("ecalli", "setHistoricalPreimage")
declare function _setHistoricalPreimage(ptr: u32, len: u32): void;

// @ts-expect-error: decorator
@external("ecalli", "setHistoricalLookupNone")
declare function _setHistoricalLookupNone(): void;

/** Configure the historical_lookup() stub. */
export class TestHistoricalLookup {
  /** Set preimage data returned by historical_lookup(). */
  static setPreimage(data: Uint8Array): void {
    _setHistoricalPreimage(u32(data.dataStart), data.byteLength);
  }

  /** Make historical_lookup() return NONE. */
  static setNone(): void {
    _setHistoricalLookupNone();
  }
}
