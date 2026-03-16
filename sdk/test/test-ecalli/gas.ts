// @ts-expect-error: decorator
@external("ecalli", "setGasValue")
declare function _setGasValue(value: i64): void;

/** Configure the gas() stub return value. */
export class TestGas {
  static set(value: i64): void {
    _setGasValue(value);
  }
}
