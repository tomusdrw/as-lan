// @ts-expect-error: decorator
@external("ecalli", "setBlessResult")
declare function _setBlessResult(result: i64): void;

// @ts-expect-error: decorator
@external("ecalli", "setAssignResult")
declare function _setAssignResult(result: i64): void;

// @ts-expect-error: decorator
@external("ecalli", "setDesignateResult")
declare function _setDesignateResult(result: i64): void;

/** Configure privileged governance mock stubs from AS test code. */
export class TestPrivileged {
  private constructor() {}

  static setBlessResult(result: i64): void {
    _setBlessResult(result);
  }

  static setAssignResult(result: i64): void {
    _setAssignResult(result);
  }

  static setDesignateResult(result: i64): void {
    _setDesignateResult(result);
  }
}
