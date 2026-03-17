/** Ecalli 14: Bless — set privileged service configuration. Returns OK. */
export declare function bless(_manager: number, _auth_queue_ptr: number, _delegator: number, _registrar: number, _auto_accum_ptr: number, _auto_accum_count: number): bigint;
/** Ecalli 15: Assign core — returns OK. */
export declare function assign(_core: number, _auth_queue_ptr: number, _assigners: number): bigint;
/** Ecalli 16: Designate next epoch validators — returns OK. */
export declare function designate(_validators_ptr: number): bigint;
