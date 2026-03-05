import { Bytes32, BytesBlob, Logger, Optional } from "as-lan-sdk";
import { CodeHash, CoreIndex, ServiceId, Slot, WorkOutput, WorkPackageHash } from "as-lan-sdk";

const logger = new Logger("fib");

export function accumulate(slot: Slot, serviceId: ServiceId, argsLength: u32): Optional<CodeHash> {
  logger.info(`Fibonacci Service Accumulate, ${serviceId} @${slot}`);

  const n: u64 = argsLength > 0 ? u64(argsLength) : 10;
  const result = fibonacci(n);
  logger.info(`fibonacci(${n}) = ${result}`);

  // Encode the fibonacci result as a CodeHash (little-endian u64 in the first 8 bytes)
  const raw = new Uint8Array(32);
  for (let i = 0; i < 8; i++) {
    raw[i] = u8((result >> (i * 8)) & 0xff);
  }
  return Optional.some<CodeHash>(Bytes32.wrap32Unchecked(raw));
}

export function refine(
  _core: CoreIndex,
  _itemIdx: u32,
  serviceId: ServiceId,
  payload: BytesBlob,
  _hash: WorkPackageHash,
): WorkOutput {
  logger.info(`Fibonacci Service Refine, ${serviceId}`);
  return payload;
}

/// Calculate fibonacci number using accumulator pattern (iterative approach)
function fibonacci(n: u64): u64 {
  if (n === 0) {
    return 0;
  }

  let a: u64 = 0;
  let b: u64 = 1;
  for (let i: u64 = 0; i < n; i++) {
    const temp = a + b;
    a = b;
    b = temp;
  }
  return a;
}
