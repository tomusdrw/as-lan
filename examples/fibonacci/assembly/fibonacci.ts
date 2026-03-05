import { AccumulateArgs, Bytes32, Logger, Optional, RefineArgs, encodeOptionalCodeHash } from "@fluffylabs/as-lan";
import { CodeHash } from "@fluffylabs/as-lan";

const logger = new Logger("fib");

export function accumulate(ptr: u32, len: u32): u64 {
  const result = AccumulateArgs.parse(ptr, len);
  if (result.isError) {
    logger.warn(`Failed to parse accumulate args: ${result.error}`);
    return 0;
  }

  const args = result.okay!;
  logger.info(`Fibonacci Service Accumulate, ${args.serviceId} @${args.slot}`);

  const n: u64 = args.argsLength > 0 ? u64(args.argsLength) : 10;
  const fibResult = fibonacci(n);
  logger.info(`fibonacci(${n}) = ${fibResult}`);

  // Encode the fibonacci result as a CodeHash (little-endian u64 in the first 8 bytes)
  const raw = new Uint8Array(32);
  for (let i = 0; i < 8; i++) {
    raw[i] = u8((fibResult >> (i * 8)) & 0xff);
  }
  const hash = Optional.some<CodeHash>(Bytes32.wrapUnchecked(raw));
  return encodeOptionalCodeHash(hash).toPtrAndLen();
}

export function refine(ptr: u32, len: u32): u64 {
  const result = RefineArgs.parse(ptr, len);
  if (result.isError) {
    logger.warn(`Failed to parse refine args: ${result.error}`);
    return 0;
  }

  const args = result.okay!;
  logger.info(`Fibonacci Service Refine, ${args.serviceId}`);
  return args.payload.toPtrAndLen();
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
