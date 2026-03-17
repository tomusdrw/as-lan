import { writeToMem } from "../memory.js";
function buildDefaultInfoData() {
    const data = new Uint8Array(96);
    for (let i = 0; i < 32; i++)
        data[i] = 0xaa;
    data[32] = 0xe8;
    data[33] = 0x03;
    return data;
}
let infoData = buildDefaultInfoData();
export function info(_service, out_ptr, offset, length) {
    writeToMem(out_ptr, infoData, offset, length);
    return BigInt(infoData.length);
}
export function resetInfo() {
    infoData = buildDefaultInfoData();
}
