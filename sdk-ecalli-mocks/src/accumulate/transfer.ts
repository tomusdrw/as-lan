// Ecalli 20: Transfer funds. Configurable result.

let transferResult = 0n;

/** Ecalli 20: Transfer balance to another service. */
export function transfer(
  _dest: number,
  _amount: bigint,
  _gas_fee: bigint,
  _memo_ptr: number,
): bigint {
  return transferResult;
}

export function setTransferResult(result: bigint): void {
  transferResult = result;
}

export function resetTransfer(): void {
  transferResult = 0n;
}
