export declare function setMemory(memory: WebAssembly.Memory): void;
export declare function readUtf8(ptr: number, len: number): string | null;
export declare function readBytes(ptr: number, len: number): Uint8Array;
export declare function writeToMem(ptr: number, data: Uint8Array, offset: number, maxLen: number): void;
export declare function writeI64(ptr: number, value: bigint): void;
