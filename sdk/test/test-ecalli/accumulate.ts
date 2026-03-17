// @ts-expect-error: decorator
@external("ecalli", "setAccumulateItem")
declare function _setAccumulateItem(index: u32, ptr: u32, len: u32): void;

/**
 * Configure accumulate items (operands/transfers) for the fetch mock.
 *
 * Items set here are returned by `fetch(kind=15, index)` during accumulate.
 * Each item must be a pre-encoded TransferOrOperand blob (tag + data).
 * Use the Encoder to build these blobs in test code.
 */
export class TestAccumulate {
  /** Set a pre-encoded accumulate item at the given index. */
  static setItem(index: u32, encoded: Uint8Array): void {
    _setAccumulateItem(index, u32(encoded.dataStart), encoded.byteLength);
  }
}
