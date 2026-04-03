/**
 * A lightweight byte-buffer builder that avoids AssemblyScript's String
 * machinery.  Append ASCII strings, raw byte slices, or decimal numbers,
 * then call `finish()` to obtain a managed `Uint8Array`.
 *
 * The buffer is heap-allocated at a fixed capacity; writes that exceed
 * the capacity are silently truncated (same behaviour as LogMsg).
 */
export class ByteBuf {
  private _ptr: usize;
  private _pos: u32;
  private _cap: u32;

  static create(capacity: u32 = 256): ByteBuf {
    return new ByteBuf(capacity);
  }

  private constructor(capacity: u32) {
    this._ptr = heap.alloc(capacity);
    this._pos = 0;
    this._cap = capacity;
  }

  /** Number of bytes written so far. */
  get length(): u32 {
    return this._pos;
  }

  /** Raw pointer to the buffer start (for low-level ecalli use). */
  get dataStart(): usize {
    return this._ptr;
  }

  /** Append an ASCII string. */
  str(s: string): ByteBuf {
    const len = <u32>s.length;
    for (let i: u32 = 0; i < len; i++) {
      if (this._pos >= this._cap) break;
      store<u8>(this._ptr + this._pos, <u8>s.charCodeAt(i));
      this._pos++;
    }
    return this;
  }

  /** Append raw bytes. */
  bytes(data: Uint8Array): ByteBuf {
    const len = <u32>data.length;
    for (let i: u32 = 0; i < len; i++) {
      if (this._pos >= this._cap) break;
      store<u8>(this._ptr + this._pos, data[i]);
      this._pos++;
    }
    return this;
  }

  /** Append raw bytes as hex with a `0x` prefix. */
  hex(data: Uint8Array): ByteBuf {
    // "0x"
    if (this._pos < this._cap) {
      store<u8>(this._ptr + this._pos, 48); // '0'
      this._pos++;
    }
    if (this._pos < this._cap) {
      store<u8>(this._ptr + this._pos, 120); // 'x'
      this._pos++;
    }
    const len = <u32>data.length;
    for (let i: u32 = 0; i < len; i++) {
      if (this._pos + 1 >= this._cap) break;
      const v = data[i];
      store<u8>(this._ptr + this._pos, nibble(v >>> 4));
      this._pos++;
      store<u8>(this._ptr + this._pos, nibble(v & 0xf));
      this._pos++;
    }
    return this;
  }

  /** Append an unsigned 64-bit number as decimal ASCII. */
  u64(v: u64): ByteBuf {
    if (v === 0) {
      if (this._pos < this._cap) {
        store<u8>(this._ptr + this._pos, 48);
        this._pos++;
      }
      return this;
    }

    let temp = v;
    let digits: u32 = 0;
    while (temp > 0) {
      digits++;
      temp /= 10;
    }

    const end = min(this._pos + digits, this._cap);
    let i = end;
    temp = v;
    while (temp > 0 && i > this._pos) {
      i--;
      store<u8>(this._ptr + i, <u8>(temp % 10) + 48);
      temp /= 10;
    }
    this._pos = end;
    return this;
  }

  /** Append an unsigned 32-bit number as decimal ASCII. */
  u32(v: u32): ByteBuf {
    return this.u64(<u64>v);
  }

  /** Append a signed 32-bit number as decimal ASCII. */
  i32(v: i32): ByteBuf {
    if (v < 0) {
      if (this._pos < this._cap) {
        store<u8>(this._ptr + this._pos, 45); // '-'
        this._pos++;
      }
      return this.u32(<u32>-v);
    }
    return this.u32(<u32>v);
  }

  /** Copy the buffer contents into a new managed Uint8Array. */
  finish(): Uint8Array {
    const out = new Uint8Array(this._pos);
    memory.copy(out.dataStart, this._ptr, this._pos);
    this._pos = 0;
    return out;
  }

  /** Reset the write position without producing output. */
  reset(): void {
    this._pos = 0;
  }
}

/** Convert a 0-15 nibble to its lowercase hex ASCII char. */
function nibble(n: u8): u8 {
  // 0-9 → '0'-'9' (48-57), 10-15 → 'a'-'f' (97-102)
  return n < 10 ? n + 48 : n + 87;
}
