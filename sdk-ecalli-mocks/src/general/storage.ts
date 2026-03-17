import { readBytes, writeToMem } from "../memory.js";

const DELETE_SENTINEL = 0xffff_ffff;
const storage = new Map<string, Uint8Array>();

export function setStorageEntry(keyPtr: number, keyLen: number, valPtr: number, valLen: number): void {
  const key = readBytes(keyPtr, keyLen);
  const keyStr = new TextDecoder().decode(key);
  if (valLen === DELETE_SENTINEL) {
    storage.delete(keyStr);
  } else if (valLen === 0) {
    storage.set(keyStr, new Uint8Array(0));
  } else {
    storage.set(keyStr, readBytes(valPtr, valLen));
  }
}

export function read(
  _service: number,
  key_ptr: number,
  key_len: number,
  out_ptr: number,
  offset: number,
  length: number,
): bigint {
  const key = readBytes(key_ptr, key_len);
  const keyStr = new TextDecoder().decode(key);
  const value = storage.get(keyStr);
  if (value === undefined) {
    return -1n; // NONE
  }
  writeToMem(out_ptr, value, offset, length);
  return BigInt(value.length);
}

export function write(key_ptr: number, key_len: number, value_ptr: number, value_len: number): bigint {
  const key = readBytes(key_ptr, key_len);
  const keyStr = new TextDecoder().decode(key);
  const prevValue = storage.get(keyStr);
  if (value_len === 0) {
    storage.delete(keyStr);
  } else {
    const value = readBytes(value_ptr, value_len);
    storage.set(keyStr, value);
  }
  return prevValue !== undefined ? BigInt(prevValue.length) : -1n;
}

export function resetStorage(): void {
  storage.clear();
}
