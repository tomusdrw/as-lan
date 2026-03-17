import { readBytes, writeToMem } from "../memory.js";

let fetchData: Uint8Array | null = null;

export function setFetchData(ptr: number, len: number): void {
  fetchData = readBytes(ptr, len);
}

export function fetch(
  dest_ptr: number,
  offset: number,
  length: number,
  kind: number,
  _param1: number,
  _param2: number,
): bigint {
  let data: Uint8Array;
  if (fetchData !== null) {
    data = fetchData;
  } else {
    data = new Uint8Array(16);
    for (let i = 0; i < data.length; i++) {
      data[i] = (kind * 16 + i) & 0xff;
    }
  }
  writeToMem(dest_ptr, data, offset, length);
  return BigInt(data.length);
}

export function resetFetch(): void {
  fetchData = null;
}
