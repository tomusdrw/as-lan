// @ts-expect-error: decorator
@external("ecalli", "setInfoData")
declare function _setInfoData(ptr: u32, len: u32): void;

/** Configure the info() ecalli stub. */
export class TestInfo {
  /** Set the raw 96-byte info data returned by the info() ecalli. */
  static set(data: Uint8Array): void {
    _setInfoData(u32(data.dataStart), data.byteLength);
  }

  /** Configure info() to return NONE (simulates non-existent service). */
  static setNone(): void {
    _setInfoData(0, 0);
  }
}
