// @ts-expect-error: decorator
@external("ecalli", "setMachineResult")
declare function _setMachineResult(result: i64): void;

// @ts-expect-error: decorator
@external("ecalli", "setPeekResult")
declare function _setPeekResult(result: i64): void;

// @ts-expect-error: decorator
@external("ecalli", "setPokeResult")
declare function _setPokeResult(result: i64): void;

// @ts-expect-error: decorator
@external("ecalli", "setPagesResult")
declare function _setPagesResult(result: i64): void;

// @ts-expect-error: decorator
@external("ecalli", "setInvokeResult")
declare function _setInvokeResult(result: i64, r8: i64): void;

// @ts-expect-error: decorator
@external("ecalli", "setInvokeIoR7")
declare function _setInvokeIoR7(value: i64): void;

// @ts-expect-error: decorator
@external("ecalli", "setExpungeResult")
declare function _setExpungeResult(result: i64): void;

/** Configure machine ecalli stub return values from AS tests. */
export class TestMachine {
  static setMachineResult(result: i64): void {
    _setMachineResult(result);
  }

  static setPeekResult(result: i64): void {
    _setPeekResult(result);
  }

  static setPokeResult(result: i64): void {
    _setPokeResult(result);
  }

  static setPagesResult(result: i64): void {
    _setPagesResult(result);
  }

  static setInvokeResult(result: i64, r8: i64 = 0): void {
    _setInvokeResult(result, r8);
  }

  static setInvokeIoR7(value: i64): void {
    _setInvokeIoR7(value);
  }

  static setExpungeResult(result: i64): void {
    _setExpungeResult(result);
  }
}
