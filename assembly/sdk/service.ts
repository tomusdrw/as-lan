import {BytesBlob} from "../core/bytes";
import {Optional} from "../core/result";
import { CodeHash, CoreIndex, ServiceId, Slot, WorkOutput, WorkPackageHash } from "../jam/types";
import {Logger} from "./logger";

export function is_authorized(): u32 {
  return 0;
}

const logger = new Logger("fib");

export function accumulate(
  slot: Slot,
  serviceId: ServiceId,
  _argsLength: u32,
): Optional<CodeHash> {
  logger.info(`Fibonacci Service Accumulate, ${serviceId} @${slot}`);

  // Calculate fibonacci using accumulator pattern
  const n: u64 = 10; // Calculate fib(10)
  const result = fibonacci(n);
  logger.info(`fibonacci(${n}) = ${result}`);

  return Optional.none<CodeHash>();
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
  if (n == 0) {
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
