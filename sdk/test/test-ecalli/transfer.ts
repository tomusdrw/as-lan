// @ts-expect-error: decorator
@external("ecalli", "setTransferResult")
declare function _setTransferResult(result: i64): void;

/** Configure transfer mock stub from AS test code. */
export class TestTransfer {
  private constructor() {}

  static setTransferResult(result: i64): void {
    _setTransferResult(result);
  }
}
