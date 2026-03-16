import { readBytes, writeToMem } from "./memory.js";
let fetchData = null;
export function setFetchData(ptr, len) {
    fetchData = readBytes(ptr, len);
}
export function fetch(dest_ptr, offset, length, kind, _param1, _param2) {
    let data;
    if (fetchData !== null) {
        data = fetchData;
    }
    else {
        data = new Uint8Array(16);
        for (let i = 0; i < data.length; i++) {
            data[i] = (kind * 16 + i) & 0xff;
        }
    }
    writeToMem(dest_ptr, data, offset, length);
    return BigInt(data.length);
}
export function resetFetch() {
    fetchData = null;
}
