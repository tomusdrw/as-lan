let wasmMemory = null;
export function setMemory(memory) {
    wasmMemory = memory;
}
export function readUtf8(ptr, len) {
    if (!wasmMemory)
        return null;
    if (!len)
        return "";
    const bytes = new Uint8Array(wasmMemory.buffer, ptr, len);
    return new TextDecoder().decode(bytes);
}
export function readBytes(ptr, len) {
    if (!wasmMemory || !len)
        return new Uint8Array(0);
    return new Uint8Array(wasmMemory.buffer).slice(ptr, ptr + len);
}
export function writeToMem(ptr, data, offset, maxLen) {
    if (!wasmMemory)
        return;
    const len = Math.min(maxLen, data.length - offset);
    if (len > 0) {
        const view = new Uint8Array(wasmMemory.buffer);
        for (let i = 0; i < len; i++) {
            view[ptr + i] = data[offset + i];
        }
    }
}
