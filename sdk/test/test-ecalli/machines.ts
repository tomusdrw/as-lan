// @ts-expect-error: decorator
@external("ecalli", "setMachineResult")
declare function _setMachineResult(result: i64): void;

// @ts-expect-error: decorator
@external("ecalli", "setPeekResult")
declare function _setPeekResult(result: i64): void;

// @ts-expect-error: decorator
@external("ecalli", "setPeekData")
declare function _setPeekData(ptr: u32, len: u32): void;

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

// @ts-expect-error: decorator
@external("ecalli", "getPagesLogLength")
declare function _getPagesLogLength(): i64;

// @ts-expect-error: decorator
@external("ecalli", "getPagesLogField")
declare function _getPagesLogField(index: u32, field: u32): i64;

// @ts-expect-error: decorator
@external("ecalli", "getPokeLogLength")
declare function _getPokeLogLength(): i64;

// @ts-expect-error: decorator
@external("ecalli", "getPokeLogField")
declare function _getPokeLogField(index: u32, field: u32): i64;

// @ts-expect-error: decorator
@external("ecalli", "getPokeLogData")
declare function _getPokeLogData(index: u32, dest_ptr: u32): i64;

/** Configure machine ecalli stub return values from AS tests. */
export class TestMachine {
  static setMachineResult(result: i64): void {
    _setMachineResult(result);
  }

  static setPeekResult(result: i64): void {
    _setPeekResult(result);
  }

  static setPeekData(data: Uint8Array): void {
    _setPeekData(u32(data.dataStart), data.length);
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

  static pagesLogLength(): u32 {
    return u32(_getPagesLogLength());
  }

  /** Field: 0=machineId, 1=startPage, 2=pageCount, 3=accessType. */
  static pagesLogField(index: u32, field: u32): u32 {
    return u32(_getPagesLogField(index, field));
  }

  static pokeLogLength(): u32 {
    return u32(_getPokeLogLength());
  }

  /** Field: 0=machineId, 1=dest, 2=dataLength. */
  static pokeLogField(index: u32, field: u32): u32 {
    return u32(_getPokeLogField(index, field));
  }

  /** Copy the i-th poke()'s data into the caller-owned buffer.
   *  `buffer.length` must be ≥ `pokeLogField(index, 2)`.
   */
  static pokeLogData(index: u32, buffer: Uint8Array): u32 {
    const written = _getPokeLogData(index, u32(buffer.dataStart));
    return u32(written);
  }
}
