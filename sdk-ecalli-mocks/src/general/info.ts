import { readBytes, writeToMem } from "../memory.js";

function buildDefaultInfoData(): Uint8Array {
  const data = new Uint8Array(96);
  for (let i = 0; i < 32; i++) data[i] = 0xaa;
  data[32] = 0xe8;
  data[33] = 0x03;
  return data;
}

const infoByService = new Map<number, Uint8Array | null>();
let defaultInfoData: Uint8Array | null = buildDefaultInfoData();

export function setInfoData(service: number, ptr: number, len: number): void {
  if (len === 0) {
    infoByService.set(service, null);
  } else {
    infoByService.set(service, readBytes(ptr, len));
  }
}

export function setDefaultInfoData(ptr: number, len: number): void {
  if (len === 0) {
    defaultInfoData = null;
  } else {
    defaultInfoData = readBytes(ptr, len);
  }
}

export function info(service: number, out_ptr: number, offset: number, length: number): bigint {
  const data = infoByService.has(service) ? infoByService.get(service)! : defaultInfoData;
  if (data === null || data === undefined) return -1n; // NONE
  writeToMem(out_ptr, data, offset, length);
  return BigInt(data.length);
}

export function resetInfo(): void {
  infoByService.clear();
  defaultInfoData = buildDefaultInfoData();
}
