export type U8WithError = u16;

export function u8WithError(v: u8, error: u8): U8WithError {
  return (u16(error) << 8) + v;
}

export function u8IsError(c: U8WithError): boolean {
  return c >> 8 > 0;
}

export function ptrAndLen(data: Uint8Array): u64 {
  return (u64(data.byteLength) << 32) | u64(data.dataStart);
}
