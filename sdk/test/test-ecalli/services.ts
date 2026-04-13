// @ts-expect-error: decorator
@external("ecalli", "setNewServiceResult")
declare function _setNewServiceResult(result: i64): void;

// @ts-expect-error: decorator
@external("ecalli", "setEjectResult")
declare function _setEjectResult(result: i64): void;

// @ts-expect-error: decorator
@external("ecalli", "getLastUpgradeCodeHashPtr")
declare function _getLastUpgradeCodeHashPtr(): u32;

// @ts-expect-error: decorator
@external("ecalli", "getLastUpgradeGas")
declare function _getLastUpgradeGas(): i64;

// @ts-expect-error: decorator
@external("ecalli", "getLastUpgradeAllowance")
declare function _getLastUpgradeAllowance(): i64;

/** Configure service lifecycle mock stubs from AS test code. */
export class TestServices {
  private constructor() {}

  static setNewServiceResult(result: i64): void {
    _setNewServiceResult(result);
  }

  static setEjectResult(result: i64): void {
    _setEjectResult(result);
  }

  /** Get the code hash pointer passed to the last upgrade() call. */
  static getLastUpgradeCodeHashPtr(): u32 {
    return _getLastUpgradeCodeHashPtr();
  }

  /** Get the gas passed to the last upgrade() call. */
  static getLastUpgradeGas(): i64 {
    return _getLastUpgradeGas();
  }

  /** Get the allowance passed to the last upgrade() call. */
  static getLastUpgradeAllowance(): i64 {
    return _getLastUpgradeAllowance();
  }
}
