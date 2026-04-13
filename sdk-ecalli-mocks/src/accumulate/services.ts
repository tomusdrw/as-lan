// Ecalli 18-19, 21: Service lifecycle operations.
//
// new_service (18), upgrade (19), eject (21) — create, upgrade, or
// remove services. Configurable results.

const DEFAULT_SERVICE_START = 256;
let serviceCounter = DEFAULT_SERVICE_START;
let newServiceResultOverride: bigint | null = null;
let ejectResult = 0n;

/** Ecalli 18: Create new service — returns service ID or error sentinel. */
export function new_service(
  _code_hash_ptr: number,
  _code_len: number,
  _gas: bigint,
  _allowance: bigint,
  _gratis_storage: number,
  _requested_id: number,
): bigint {
  if (newServiceResultOverride !== null) return newServiceResultOverride;
  return BigInt(serviceCounter++);
}

/** Ecalli 19: Upgrade service code — returns OK. */
export function upgrade(
  _code_hash_ptr: number,
  _gas: bigint,
  _allowance: bigint,
): bigint {
  return 0n; // OK
}

/** Ecalli 21: Eject service — returns OK or error sentinel. */
export function eject(
  _service: number,
  _prev_code_hash_ptr: number,
): bigint {
  return ejectResult;
}

export function setNewServiceResult(result: bigint): void {
  newServiceResultOverride = result;
}

export function setEjectResult(result: bigint): void {
  ejectResult = result;
}

export function resetServices(): void {
  serviceCounter = DEFAULT_SERVICE_START;
  newServiceResultOverride = null;
  ejectResult = 0n;
}
