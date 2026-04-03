// @ts-expect-error: decorator
@external("ecalli", "setInfoData")
declare function _setInfoData(service: u32, ptr: u32, len: u32): void;

// @ts-expect-error: decorator
@external("ecalli", "setDefaultInfoData")
declare function _setDefaultInfoData(ptr: u32, len: u32): void;

/** Configure the info() ecalli stub. */
export class TestInfo {
  /** Set the raw 96-byte info data returned for a specific service ID. */
  static set(service: u32, data: Uint8Array): void {
    _setInfoData(service, u32(data.dataStart), data.byteLength);
  }

  /** Configure info() to return NONE for a specific service ID. */
  static setNone(service: u32): void {
    _setInfoData(service, 0, 0);
  }

  /** Set the default info data returned when no service-specific data is configured. */
  static setDefault(data: Uint8Array): void {
    _setDefaultInfoData(u32(data.dataStart), data.byteLength);
  }

  /** Configure info() to return NONE by default (for unconfigured services). */
  static setDefaultNone(): void {
    _setDefaultInfoData(0, 0);
  }
}
