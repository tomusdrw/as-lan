import { readBytes, writeToMem } from "../memory.js";
const DELETE_SENTINEL = 0xffff_ffff;
const storage = new Map();
export function setStorageEntry(keyPtr, keyLen, valPtr, valLen) {
    const key = readBytes(keyPtr, keyLen);
    const keyStr = new TextDecoder().decode(key);
    if (valLen === DELETE_SENTINEL) {
        storage.delete(keyStr);
    }
    else if (valLen === 0) {
        storage.set(keyStr, new Uint8Array(0));
    }
    else {
        storage.set(keyStr, readBytes(valPtr, valLen));
    }
}
export function read(_service, key_ptr, key_len, out_ptr, offset, length) {
    const key = readBytes(key_ptr, key_len);
    const keyStr = new TextDecoder().decode(key);
    const value = storage.get(keyStr);
    if (value === undefined) {
        return -1n; // NONE
    }
    writeToMem(out_ptr, value, offset, length);
    return BigInt(value.length);
}
export function write(key_ptr, key_len, value_ptr, value_len) {
    const key = readBytes(key_ptr, key_len);
    const keyStr = new TextDecoder().decode(key);
    const prevValue = storage.get(keyStr);
    if (value_len === 0) {
        storage.delete(keyStr);
    }
    else {
        const value = readBytes(value_ptr, value_len);
        storage.set(keyStr, value);
    }
    return prevValue !== undefined ? BigInt(prevValue.length) : -1n;
}
export function resetStorage() {
    storage.clear();
}
