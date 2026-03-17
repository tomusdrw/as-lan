import { readBytes, writeToMem } from "../memory.js";
let fetchData = null;
export function setFetchData(ptr, len) {
    fetchData = readBytes(ptr, len);
}
// --- Accumulate items for fetch kind=14/15 ---
/** Encoded accumulate items (operands + transfers), each as a tagged blob. */
let accumulateItems = [];
/**
 * Set accumulate items that fetch(kind=15, index) will return.
 * Each item must be a pre-encoded TransferOrOperand blob (tag + data).
 */
export function setAccumulateItems(items) {
    accumulateItems = items;
}
/** Set a single accumulate item at the given index (callable from WASM via @external). */
export function setAccumulateItem(index, ptr, len) {
    const data = readBytes(ptr, len);
    while (accumulateItems.length <= index) {
        accumulateItems.push(new Uint8Array(0));
    }
    accumulateItems[index] = data;
}
/** Encode an Operand as a TransferOrOperand blob (tag=0 + operand encoding). */
export function encodeOperand(fields) {
    const parts = [];
    // tag = 0 (operand)
    parts.push(encodeVarU64(0n));
    // hash (32 bytes)
    parts.push(fields.hash ?? new Uint8Array(32));
    // exportsRoot (32 bytes)
    parts.push(fields.exportsRoot ?? new Uint8Array(32));
    // authorizerHash (32 bytes)
    parts.push(fields.authorizerHash ?? new Uint8Array(32));
    // payloadHash (32 bytes)
    parts.push(fields.payloadHash ?? new Uint8Array(32));
    // gas (varU64)
    parts.push(encodeVarU64(fields.gas ?? 100000n));
    // result: WorkExecResult (varint tag + optional blob)
    const resultKind = fields.resultKind ?? 0;
    parts.push(encodeVarU64(BigInt(resultKind)));
    if (resultKind === 0) {
        // Ok variant: followed by blob (length-prefixed)
        const blob = fields.okBlob ?? new Uint8Array(0);
        parts.push(encodeVarU64(BigInt(blob.length)));
        parts.push(blob);
    }
    // authorizationOutput (blob)
    const authOut = fields.authorizationOutput ?? new Uint8Array(0);
    parts.push(encodeVarU64(BigInt(authOut.length)));
    parts.push(authOut);
    return concatArrays(parts);
}
/** Encode a PendingTransfer as a TransferOrOperand blob (tag=1 + transfer encoding). */
export function encodeTransfer(fields) {
    const parts = [];
    // tag = 1 (transfer)
    parts.push(encodeVarU64(1n));
    // source (u32 LE)
    parts.push(encodeU32(fields.source));
    // destination (u32 LE)
    parts.push(encodeU32(fields.destination));
    // amount (u64 LE)
    parts.push(encodeU64(fields.amount));
    // memo (128 bytes fixed)
    const memo = new Uint8Array(128);
    if (fields.memo) {
        memo.set(fields.memo.subarray(0, 128));
    }
    parts.push(memo);
    // gas (u64 LE)
    parts.push(encodeU64(fields.gas));
    return concatArrays(parts);
}
// --- Main fetch function ---
export function fetch(dest_ptr, offset, length, kind, param1, _param2) {
    // Kind 15: OneTransferOrOperand — single item by index
    if (kind === 15) {
        const index = param1;
        if (index >= accumulateItems.length) {
            return -1n; // NONE
        }
        const data = accumulateItems[index];
        writeToMem(dest_ptr, data, offset, length);
        return BigInt(data.length);
    }
    // Kind 14: AllTransfersAndOperands — all items as a sequence
    if (kind === 14) {
        const data = encodeSequenceVarLen(accumulateItems);
        writeToMem(dest_ptr, data, offset, length);
        return BigInt(data.length);
    }
    // Default: synthetic pattern or pre-set data
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
    accumulateItems = [];
}
// --- Encoding helpers ---
function encodeVarU64(value) {
    if (value < 0n)
        throw new Error("varU64: negative value");
    if (value < 128n) {
        return new Uint8Array([Number(value)]);
    }
    // Determine number of extra bytes
    let l = 1;
    for (; l <= 7; l++) {
        if (value < 1n << BigInt(7 * (l + 1)))
            break;
    }
    if (l > 7)
        l = 8;
    if (l === 8) {
        const buf = new Uint8Array(9);
        buf[0] = 0xff;
        new DataView(buf.buffer).setBigUint64(1, value, true);
        return buf;
    }
    const buf = new Uint8Array(1 + l);
    const shifted = value >> BigInt(8 * l);
    const prefix = (2 ** 8 - 2 ** (8 - l)) & 0xff;
    buf[0] = prefix | Number(shifted);
    for (let i = 0; i < l; i++) {
        buf[1 + i] = Number((value >> BigInt(8 * i)) & 0xffn);
    }
    return buf;
}
function encodeU32(value) {
    const buf = new Uint8Array(4);
    new DataView(buf.buffer).setUint32(0, value, true);
    return buf;
}
function encodeU64(value) {
    const buf = new Uint8Array(8);
    new DataView(buf.buffer).setBigUint64(0, value, true);
    return buf;
}
function encodeSequenceVarLen(items) {
    const parts = [];
    parts.push(encodeVarU64(BigInt(items.length)));
    for (const item of items) {
        parts.push(item);
    }
    return concatArrays(parts);
}
function concatArrays(arrays) {
    let totalLen = 0;
    for (const a of arrays)
        totalLen += a.length;
    const result = new Uint8Array(totalLen);
    let offset = 0;
    for (const a of arrays) {
        result.set(a, offset);
        offset += a.length;
    }
    return result;
}
