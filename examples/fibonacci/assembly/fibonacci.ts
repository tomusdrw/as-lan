import {
  AccumulateArgs,
  Bytes32,
  CodeHash,
  encodeOptionalCodeHash,
  LogMsg,
  Optional,
  RefineArgs,
} from "@fluffylabs/as-lan";

// LogMsg is a lightweight buffer-based logger that avoids pulling in
// AssemblyScript's String machinery (~24% smaller WASM than Logger).
// You can also use `Logger.create("fib")` with template literals for convenience.
const logger: LogMsg = LogMsg.create("fib");

export function accumulate(ptr: u32, len: u32): u64 {
  const result = AccumulateArgs.parse(ptr, len);
  if (result.isError) {
    logger.str("Failed to parse accumulate args: ").i32(result.error).warn();
    return 0;
  }

  const args = result.okay!;
  logger.str("Fibonacci Service Accumulate, ").u32(args.serviceId).str(" @").u32(args.slot).info();

  const n: u64 = args.argsLength > 0 ? u64(args.argsLength) : 10;
  const fibResult = fibonacci(n);
  logger.str("fibonacci(").u64(n).str(") = ").u64(fibResult).info();

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
    logger.str("Failed to parse refine args: ").i32(result.error).warn();
    return 0;
  }

  const args = result.okay!;
  logger.str("Fibonacci Service Refine, ").u32(args.serviceId).info();
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
