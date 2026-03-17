/** Ecalli 22: Query preimage status — returns NONE, writes r8 = 0. */
export declare function query(_hash_ptr: number, _length: number, out_r8: number): bigint;
/** Ecalli 23: Solicit preimage — returns OK. */
export declare function solicit(_hash_ptr: number, _length: number): bigint;
/** Ecalli 24: Forget preimage solicitation — returns OK. */
export declare function forget(_hash_ptr: number, _length: number): bigint;
/** Ecalli 25: Yield accumulation result hash — returns OK. */
export declare function yield_result(_hash_ptr: number): bigint;
/** Ecalli 26: Provide preimage for solicited hash — returns OK. */
export declare function provide(_service: number, _preimage_ptr: number, _preimage_len: number): bigint;
