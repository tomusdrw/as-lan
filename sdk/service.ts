import { BytesBlob } from "./core/bytes";
import { Decoder } from "./core/codec";
import { Optional } from "./core/result";
import { CodeHash, CoreIndex, ServiceId, Slot, WorkOutput, WorkPackageHash } from "./jam/types";

// Types for user-provided callbacks
export type AccumulateFn = (slot: Slot, serviceId: ServiceId, argsLength: u32) => Optional<CodeHash>;
export type RefineFn = (
  core: CoreIndex,
  itemIndex: u32,
  serviceId: ServiceId,
  payload: BytesBlob,
  hash: WorkPackageHash,
) => WorkOutput;
export type IsAuthorizedFn = () => u32;

// Registered callbacks — users call registerService() at module init
let _accumulate: AccumulateFn | null = null;
let _refine: RefineFn | null = null;
let _isAuthorized: IsAuthorizedFn | null = null;

// Result output globals — the host reads these after calling refine_ext/accumulate_ext
export let result_ptr: u32 = 0;
export let result_len: u32 = 0;

/**
 * Register service callbacks. Call this once at module initialization.
 *
 * @param accumulate - Called during the accumulate phase
 * @param refine - Called during the refine phase
 * @param isAuthorized - Optional authorization check (defaults to returning 0)
 */
export function registerService(
  accumulate: AccumulateFn,
  refine: RefineFn,
  isAuthorized: IsAuthorizedFn | null = null,
): void {
  if (_accumulate !== null || _refine !== null) {
    throw new Error("registerService() has already been called. It can only be called once.");
  }
  _accumulate = accumulate;
  _refine = refine;
  _isAuthorized = isAuthorized;
}

// Raw memory helpers

/** Read bytes from raw WASM linear memory into a managed Uint8Array. */
function readFromMemory(ptr: u32, len: u32): Uint8Array {
  const data = new Uint8Array(len);
  memory.copy(data.dataStart, ptr, len);
  return data;
}

/** Write a Uint8Array result to the exported result_ptr/result_len globals. */
function writeResult(data: Uint8Array): void {
  result_ptr = u32(data.dataStart);
  result_len = data.byteLength;
}

// ABI helpers

function ensureDecodeOk(decoder: Decoder): void {
  if (decoder.isError || !decoder.isFinished()) {
    throw new Error("Invalid ABI payload");
  }
}

function strictU16(val: u64): u16 {
  if (val > 0xffff) {
    throw new Error("ABI value exceeds u16 range");
  }
  return u16(val);
}

function strictU32(val: u64): u32 {
  if (val > 0xffff_ffff) {
    throw new Error("ABI value exceeds u32 range");
  }
  return u32(val);
}

function encodeOptionalCodeHash(hash: Optional<CodeHash>): Uint8Array {
  if (!hash.isSome) {
    return new Uint8Array(1);
  }

  const out = new Uint8Array(33);
  out[0] = 1;
  out.set(hash.val!.raw, 1);
  return out;
}

// Internal logic (takes/returns Uint8Array — used by tests)

export function refine_impl(inData: Uint8Array): Uint8Array {
  if (_refine === null) {
    throw new Error("No refine callback registered. Call registerService() first.");
  }

  const decoder = Decoder.fromBlob(inData);
  const coreIndex = strictU16(decoder.varU64());
  const itemIndex = strictU32(decoder.varU64());
  const serviceId = strictU32(decoder.varU64());
  const payload = decoder.bytesVarLen();
  const workPackageHash = decoder.bytes32();

  ensureDecodeOk(decoder);

  const output = _refine!(coreIndex, itemIndex, serviceId, payload, workPackageHash);
  return output.raw;
}

export function accumulate_impl(inData: Uint8Array): Uint8Array {
  if (_accumulate === null) {
    throw new Error("No accumulate callback registered. Call registerService() first.");
  }

  const decoder = Decoder.fromBlob(inData);
  const slot = strictU32(decoder.varU64());
  const serviceId = strictU32(decoder.varU64());
  const argsLength = strictU32(decoder.varU64());

  ensureDecodeOk(decoder);

  const output = _accumulate!(slot, serviceId, argsLength);
  return encodeOptionalCodeHash(output);
}

// Exported WASM entry points — take raw pointers, write result to globals

export function refine_ext(args_ptr: u32, args_len: u32): void {
  const inData = readFromMemory(args_ptr, args_len);
  const output = refine_impl(inData);
  writeResult(output);
}

export function accumulate_ext(args_ptr: u32, args_len: u32): void {
  const inData = readFromMemory(args_ptr, args_len);
  const output = accumulate_impl(inData);
  writeResult(output);
}

export function is_authorized(): u32 {
  if (_isAuthorized !== null) {
    return _isAuthorized!();
  }
  return 0;
}
