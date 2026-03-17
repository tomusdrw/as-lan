export declare function setStorageEntry(keyPtr: number, keyLen: number, valPtr: number, valLen: number): void;
export declare function read(_service: number, key_ptr: number, key_len: number, out_ptr: number, offset: number, length: number): bigint;
export declare function write(key_ptr: number, key_len: number, value_ptr: number, value_len: number): bigint;
export declare function resetStorage(): void;
