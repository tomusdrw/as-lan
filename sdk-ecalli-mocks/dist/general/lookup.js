import { readBytes, writeToMem } from "../memory.js";
const DEFAULT_PREIMAGE = new TextEncoder().encode("test-preimage");
let lookupPreimage = DEFAULT_PREIMAGE;
export function setLookupPreimage(ptr, len) {
    lookupPreimage = readBytes(ptr, len);
}
export function lookup(_service, _hash_ptr, out_ptr, offset, length) {
    writeToMem(out_ptr, lookupPreimage, offset, length);
    return BigInt(lookupPreimage.length);
}
export function resetLookup() {
    lookupPreimage = DEFAULT_PREIMAGE;
}
