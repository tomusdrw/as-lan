/** Ecalli 8: Create inner PVM machine — returns incrementing machine ID. */
export declare function machine(_code_ptr: number, _code_len: number, _entrypoint: number): bigint;
/** Ecalli 9: Peek inner machine memory — returns OK. */
export declare function peek(_machine_id: number, _dest_ptr: number, _source: number, _length: number): bigint;
/** Ecalli 10: Poke inner machine memory — returns OK. */
export declare function poke(_machine_id: number, _source_ptr: number, _dest: number, _length: number): bigint;
/** Ecalli 11: Set inner machine page access — returns OK. */
export declare function pages(_machine_id: number, _start_page: number, _page_count: number, _access_type: number): bigint;
/** Ecalli 12: Invoke inner machine — returns HALT (0), writes r8 = 0. */
export declare function invoke(_machine_id: number, _io_ptr: number, out_r8: number): bigint;
/** Ecalli 13: Expunge inner machine — returns OK. */
export declare function expunge(_machine_id: number): bigint;
export declare function resetMachines(): void;
