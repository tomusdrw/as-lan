/** Ecalli 18: Create new service — returns incrementing service ID. */
export declare function new_service(_code_hash_ptr: number, _code_len: number, _gas: bigint, _allowance: bigint, _gratis_storage: number, _requested_id: number): bigint;
/** Ecalli 19: Upgrade service code — returns OK. */
export declare function upgrade(_code_hash_ptr: number, _gas: bigint, _allowance: bigint): bigint;
/** Ecalli 21: Eject service — returns OK. */
export declare function eject(_service: number, _prev_code_hash_ptr: number): bigint;
export declare function resetServices(): void;
