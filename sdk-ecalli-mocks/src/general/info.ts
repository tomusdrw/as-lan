import { readBytes, writeToMem } from "../memory.js";

function buildDefaultInfoData(): Uint8Array {
  const data = new Uint8Array(96);
  for (let i = 0; i < 32; i++) data[i] = 0xaa;
  data[32] = 0xe8;
  data[33] = 0x03;
  return data;
}

let infoData: Uint8Array | null = buildDefaultInfoData();

export function setInfoData(ptr: number, len: number): void {
  if (len === 0) {
    infoData = null; // Simulate non-existent service (returns NONE)
  } else {
    infoData = readBytes(ptr, len);
  }
}

export function info(_service: number, out_ptr: number, offset: number, length: number): bigint {
  if (infoData === null) return -1n; // NONE
  writeToMem(out_ptr, infoData, offset, length);
  return BigInt(infoData.length);
}

export function resetInfo(): void {
  infoData = buildDefaultInfoData();
}
