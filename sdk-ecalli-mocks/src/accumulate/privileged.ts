// Ecalli 14-16: Privileged governance operations.
//
// bless (14), assign (15), designate (16) — only callable by the
// privileged service (manager/delegator/registrar). Configurable results.

let blessResult = 0n;
let assignResult = 0n;
let designateResult = 0n;

/** Ecalli 14: Bless — set privileged service configuration. */
export function bless(
  _manager: number,
  _assigners_ptr: number,
  _delegator: number,
  _registrar: number,
  _auto_accum_ptr: number,
  _auto_accum_count: number,
): bigint {
  return blessResult;
}

/** Ecalli 15: Assign core auth queue. */
export function assign(
  _core: number,
  _auth_queue_ptr: number,
  _new_assigner: number,
): bigint {
  return assignResult;
}

/** Ecalli 16: Designate next epoch validators. */
export function designate(
  _validators_ptr: number,
): bigint {
  return designateResult;
}

export function setBlessResult(result: bigint): void {
  blessResult = result;
}

export function setAssignResult(result: bigint): void {
  assignResult = result;
}

export function setDesignateResult(result: bigint): void {
  designateResult = result;
}

export function resetPrivileged(): void {
  blessResult = 0n;
  assignResult = 0n;
  designateResult = 0n;
}
