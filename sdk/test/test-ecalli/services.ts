// @ts-expect-error: decorator
@external("ecalli", "setNewServiceResult")
declare function _setNewServiceResult(result: i64): void;

// @ts-expect-error: decorator
@external("ecalli", "setEjectResult")
declare function _setEjectResult(result: i64): void;

/** Configure service lifecycle mock stubs from AS test code. */
export class TestServices {
  static setNewServiceResult(result: i64): void {
    _setNewServiceResult(result);
  }

  static setEjectResult(result: i64): void {
    _setEjectResult(result);
  }
}
