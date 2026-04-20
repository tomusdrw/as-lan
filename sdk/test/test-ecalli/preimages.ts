import { Bytes32, BytesBlob } from "../../core/bytes";

// @ts-expect-error: decorator
@external("ecalli", "setQueryResult")
declare function _setQueryResult(r7: i64, r8: i64): void;

// @ts-expect-error: decorator
@external("ecalli", "setSolicitResult")
declare function _setSolicitResult(result: i64): void;

// @ts-expect-error: decorator
@external("ecalli", "setForgetResult")
declare function _setForgetResult(result: i64): void;

// @ts-expect-error: decorator
@external("ecalli", "setProvideResult")
declare function _setProvideResult(result: i64): void;

// @ts-expect-error: decorator
@external("ecalli", "getSolicitCount")
declare function _getSolicitCount(): i64;

// @ts-expect-error: decorator
@external("ecalli", "getForgetCount")
declare function _getForgetCount(): i64;

// @ts-expect-error: decorator
@external("ecalli", "getProvideCount")
declare function _getProvideCount(): i64;

// @ts-expect-error: decorator
@external("ecalli", "resetPreimageCounters")
declare function _resetPreimageCounters(): void;

// @ts-expect-error: decorator
@external("ecalli", "setPreimageAttached")
declare function _setPreimageAttached(hash_ptr: u32, preimage_ptr: u32, preimage_len: u32): void;

// @ts-expect-error: decorator
@external("ecalli", "clearPreimageAttachments")
declare function _clearPreimageAttachments(): void;

/** Configure accumulate preimage ecalli stubs. */
export class TestPreimages {
  /**
   * Configure query() return values.
   *
   * Encoding: r7 = (slot0 << 32) | kind, r8 = (slot2 << 32) | slot1.
   * Set r7 = -1 (NONE) for "not solicited".
   */
  static setQueryResult(r7: i64, r8: i64 = 0): void {
    _setQueryResult(r7, r8);
  }

  /** Configure solicit() return value (0 = OK, -9 = HUH, -5 = FULL). */
  static setSolicitResult(result: i64): void {
    _setSolicitResult(result);
  }

  /** Configure forget() return value (0 = OK, -9 = HUH). */
  static setForgetResult(result: i64): void {
    _setForgetResult(result);
  }

  /** Configure provide() return value (0 = OK, -4 = WHO, -9 = HUH). */
  static setProvideResult(result: i64): void {
    _setProvideResult(result);
  }

  static getSolicitCount(): i64 {
    return _getSolicitCount();
  }

  static getForgetCount(): i64 {
    return _getForgetCount();
  }

  static getProvideCount(): i64 {
    return _getProvideCount();
  }

  static resetCounters(): void {
    _resetPreimageCounters();
  }

  /**
   * Simulate a preimage arriving via the `xtpreimages` block extrinsic.
   *
   * Subsequent `lookup(hash)` ecalli calls will return `preimage`,
   * regardless of service id. Use this to emulate the out-of-band
   * preimage delivery path (CE 142 gossip + xtpreimages inclusion)
   * in tests without calling `provide` from the service.
   */
  static setAttachedPreimage(hash: Bytes32, preimage: BytesBlob): void {
    _setPreimageAttached(hash.ptr(), preimage.ptr(), preimage.length);
  }

  /** Clear all attached preimages. */
  static clearAttachedPreimages(): void {
    _clearPreimageAttachments();
  }
}
