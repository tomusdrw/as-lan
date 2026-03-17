export declare function setFetchData(ptr: number, len: number): void;
/**
 * Set accumulate items that fetch(kind=15, index) will return.
 * Each item must be a pre-encoded TransferOrOperand blob (tag + data).
 */
export declare function setAccumulateItems(items: Uint8Array[]): void;
/** Set a single accumulate item at the given index (callable from WASM via @external). */
export declare function setAccumulateItem(index: number, ptr: number, len: number): void;
/** Encode an Operand as a TransferOrOperand blob (tag=0 + operand encoding). */
export declare function encodeOperand(fields: {
    hash?: Uint8Array;
    exportsRoot?: Uint8Array;
    authorizerHash?: Uint8Array;
    payloadHash?: Uint8Array;
    gas?: bigint;
    resultKind?: number;
    okBlob?: Uint8Array;
    authorizationOutput?: Uint8Array;
}): Uint8Array;
/** Encode a PendingTransfer as a TransferOrOperand blob (tag=1 + transfer encoding). */
export declare function encodeTransfer(fields: {
    source: number;
    destination: number;
    amount: bigint;
    memo?: Uint8Array;
    gas: bigint;
}): Uint8Array;
export declare function fetch(dest_ptr: number, offset: number, length: number, kind: number, param1: number, _param2: number): bigint;
export declare function resetFetch(): void;
