import { readBytes, writeToMem } from "../memory.js";

let fetchData: Uint8Array | null = null;

export function setFetchData(ptr: number, len: number): void {
  fetchData = readBytes(ptr, len);
}

// --- Accumulate items for fetch kind=14/15 ---

/** Encoded accumulate items (operands + transfers), each as a tagged blob. */
let accumulateItems: Uint8Array[] = [];

/**
 * Set accumulate items that fetch(kind=15, index) will return.
 * Each item must be a pre-encoded TransferOrOperand blob (tag + data).
 */
export function setAccumulateItems(items: Uint8Array[]): void {
  accumulateItems = items;
}

/** Set a single accumulate item at the given index (callable from WASM via @external). */
export function setAccumulateItem(index: number, ptr: number, len: number): void {
  const data = readBytes(ptr, len);
  while (accumulateItems.length <= index) {
    accumulateItems.push(new Uint8Array(0));
  }
  accumulateItems[index] = data;
}

/** Encode an Operand as a TransferOrOperand blob (tag=0 + operand encoding). */
export function encodeOperand(fields: {
  hash?: Uint8Array;
  exportsRoot?: Uint8Array;
  authorizerHash?: Uint8Array;
  payloadHash?: Uint8Array;
  gas?: bigint;
  resultKind?: number;
  okBlob?: Uint8Array;
  authorizationOutput?: Uint8Array;
}): Uint8Array {
  const parts: Uint8Array[] = [];
  // tag = 0 (operand)
  parts.push(encodeVarU64(0n));
  // hash fields (each exactly 32 bytes)
  parts.push(assertBytes32(fields.hash, "hash"));
  parts.push(assertBytes32(fields.exportsRoot, "exportsRoot"));
  parts.push(assertBytes32(fields.authorizerHash, "authorizerHash"));
  parts.push(assertBytes32(fields.payloadHash, "payloadHash"));
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
export function encodeTransfer(fields: {
  source: number;
  destination: number;
  amount: bigint;
  memo?: Uint8Array;
  gas: bigint;
}): Uint8Array {
  const parts: Uint8Array[] = [];
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

export function fetch(
  dest_ptr: number,
  offset: number,
  length: number,
  kind: number,
  param1: number,
  _param2: number,
): bigint {
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
  accumulateItems = [];
}

// --- Encoding helpers ---

function assertBytes32(field: Uint8Array | undefined, name: string): Uint8Array {
  if (field === undefined) return new Uint8Array(32);
  if (field.length !== 32) throw new RangeError(`${name} must be 32 bytes, got ${field.length}`);
  return field;
}

function encodeVarU64(value: bigint): Uint8Array {
  if (value < 0n) throw new Error("varU64: negative value");
  if (value < 128n) {
    return new Uint8Array([Number(value)]);
  }
  // Determine number of extra bytes
  let l = 1;
  for (; l <= 7; l++) {
    if (value < 1n << BigInt(7 * (l + 1))) break;
  }
  if (l > 7) l = 8;

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

function encodeU32(value: number): Uint8Array {
  const buf = new Uint8Array(4);
  new DataView(buf.buffer).setUint32(0, value, true);
  return buf;
}

function encodeU64(value: bigint): Uint8Array {
  const buf = new Uint8Array(8);
  new DataView(buf.buffer).setBigUint64(0, value, true);
  return buf;
}

function encodeSequenceVarLen(items: Uint8Array[]): Uint8Array {
  const parts: Uint8Array[] = [];
  parts.push(encodeVarU64(BigInt(items.length)));
  for (const item of items) {
    parts.push(item);
  }
  return concatArrays(parts);
}

function concatArrays(arrays: Uint8Array[]): Uint8Array {
  let totalLen = 0;
  for (const a of arrays) totalLen += a.length;
  const result = new Uint8Array(totalLen);
  let offset = 0;
  for (const a of arrays) {
    result.set(a, offset);
    offset += a.length;
  }
  return result;
}
