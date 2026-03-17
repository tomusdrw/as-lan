const DEFAULT_GAS = 1_000_000n;

let gasValue: bigint = DEFAULT_GAS;

export function setGasValue(value: bigint): void {
  gasValue = value;
}

export function gas(): bigint {
  return gasValue;
}

export function resetGas(): void {
  gasValue = DEFAULT_GAS;
}
