import { log } from "./ecalli";
import { LogLevel } from "./logger";

// @ts-expect-error: ASC_OPTIMIZE_LEVEL is an AssemblyScript compile-time constant
const DEBUG_LOGGING: bool = ASC_OPTIMIZE_LEVEL < 3;

const MAX_MSG: u32 = 256;

/**
 * A lightweight logger that writes directly to a fixed-size byte buffer,
 * avoiding AssemblyScript's String machinery (concat, UTF8.encode, toString).
 *
 * Usage:
 *   const log = new LogMsg("target");
 *   log.str("count: ").u64(42).info();
 */
export class LogMsg {
  private _targetPtr: usize;
  private _targetLen: u32;
  private _bufPtr: usize;
  private _pos: u32;

  constructor(target: string) {
    // Encode target as ASCII bytes into raw memory
    const tLen = <u32>target.length;
    this._targetPtr = heap.alloc(tLen);
    for (let i: u32 = 0; i < tLen; i++) {
      store<u8>(this._targetPtr + i, <u8>target.charCodeAt(i));
    }
    this._targetLen = tLen;

    // Allocate message buffer
    this._bufPtr = heap.alloc(MAX_MSG);
    this._pos = 0;
  }

  /** Append an ASCII string to the buffer. */
  str(s: string): LogMsg {
    const len = <u32>s.length;
    for (let i: u32 = 0; i < len; i++) {
      if (this._pos >= MAX_MSG) break;
      store<u8>(this._bufPtr + this._pos, <u8>s.charCodeAt(i));
      this._pos++;
    }
    return this;
  }

  /** Append an unsigned 64-bit number as decimal. */
  u64(v: u64): LogMsg {
    if (v === 0) {
      if (this._pos < MAX_MSG) {
        store<u8>(this._bufPtr + this._pos, 48);
        this._pos++;
      }
      return this;
    }

    // Count digits
    let temp = v;
    let digits: u32 = 0;
    while (temp > 0) {
      digits++;
      temp /= 10;
    }

    // Write right-to-left
    const end = min(this._pos + digits, MAX_MSG);
    let i = end;
    temp = v;
    while (temp > 0 && i > this._pos) {
      i--;
      store<u8>(this._bufPtr + i, <u8>(temp % 10) + 48);
      temp /= 10;
    }
    this._pos = end;
    return this;
  }

  /** Append an unsigned 32-bit number as decimal. */
  u32(v: u32): LogMsg {
    return this.u64(<u64>v);
  }

  /** Append a signed 32-bit number as decimal. */
  i32(v: i32): LogMsg {
    if (v < 0) {
      if (this._pos < MAX_MSG) {
        store<u8>(this._bufPtr + this._pos, 45); // '-'
        this._pos++;
      }
      return this.u32(<u32>-v);
    }
    return this.u32(<u32>v);
  }

  fatal(): void {
    this._send(LogLevel.Fatal);
  }
  warn(): void {
    this._send(LogLevel.Warning);
  }
  info(): void {
    this._send(LogLevel.Important);
  }

  debug(): void {
    if (DEBUG_LOGGING) {
      this._send(LogLevel.Helpful);
    } else {
      this._pos = 0;
    }
  }

  trace(): void {
    if (DEBUG_LOGGING) {
      this._send(LogLevel.Pedantic);
    } else {
      this._pos = 0;
    }
  }

  private _send(level: LogLevel): void {
    log(<u32>level, <u32>this._targetPtr, this._targetLen, <u32>this._bufPtr, this._pos);
    this._pos = 0;
  }
}
