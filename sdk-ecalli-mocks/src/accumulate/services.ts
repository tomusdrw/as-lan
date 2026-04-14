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

let lastUpgradeCodeHashPtr = -1;
let lastUpgradeGas = 0n;
let lastUpgradeAllowance = 0n;

/** Ecalli 19: Upgrade service code — returns OK. Captures args for test assertions. */
export function upgrade(
  _code_hash_ptr: number,
  _gas: bigint,
  _allowance: bigint,
): bigint {
  lastUpgradeCodeHashPtr = _code_hash_ptr;
  lastUpgradeGas = _gas;
  lastUpgradeAllowance = _allowance;
  return 0n; // OK
}

export function getLastUpgradeCodeHashPtr(): number {
  return lastUpgradeCodeHashPtr;
}

export function getLastUpgradeGas(): bigint {
  return lastUpgradeGas;
}

export function getLastUpgradeAllowance(): bigint {
  return lastUpgradeAllowance;
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
  lastUpgradeCodeHashPtr = -1;
  lastUpgradeGas = 0n;
  lastUpgradeAllowance = 0n;
}
