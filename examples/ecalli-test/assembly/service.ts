import {
  BytesBlob,
  Decoder,
  Encoder,
  fetch,
  gas,
  info,
  Logger,
  log,
  lookup,
  ptrAndLen,
  RefineArgs,
  read,
  write,
} from "@fluffylabs/as-lan";
import { EcalliIndex } from "./ecalli-index";

const logger: Logger = new Logger("ecalli-test");

/**
 * Refine: dynamically dispatches an ecalli host call based on the payload.
 *
 * Payload format:
 *   ecalli_index: varU64
 *   ...params (ecalli-specific, see dispatch functions)
 *
 * Response format:
 *   result: u64 LE (the ecalli return value)
 *   data: bytesVarLen (output buffer contents, if any)
 */
export function refine(ptr: u32, len: u32): u64 {
  const result = RefineArgs.parse(ptr, len);
  if (result.isError) {
    logger.warn(`Failed to parse refine args: ${result.error}`);
    return 0;
  }

  const args = result.okay!;
  const d = Decoder.fromBlob(args.payload.raw);
  const ecalliIndex = d.varU64();
  if (d.isError) {
    logger.warn("Missing ecalli index in payload");
    return 0;
  }

  logger.info(`dispatch ecalli ${ecalliIndex}`);

  if (ecalliIndex === EcalliIndex.Gas) return dispatchGas();
  if (ecalliIndex === EcalliIndex.Fetch) return dispatchFetch(d);
  if (ecalliIndex === EcalliIndex.Lookup) return dispatchLookup(d);
  if (ecalliIndex === EcalliIndex.Read) return dispatchRead(d);
  if (ecalliIndex === EcalliIndex.Write) return dispatchWrite(d);
  if (ecalliIndex === EcalliIndex.Info) return dispatchInfo(d);
  if (ecalliIndex === EcalliIndex.Log) return dispatchLog(d);

  logger.warn(`Unknown ecalli index: ${ecalliIndex}`);
  return 0;
}

export function accumulate(_ptr: u32, _len: u32): u64 {
  return 0;
}

// --- Response encoding ---

function respond(ecalliResult: i64, data: Uint8Array | null = null): u64 {
  const enc = Encoder.create();
  enc.u64(u64(ecalliResult));
  if (data !== null) {
    enc.bytesVarLen(BytesBlob.wrap(data));
  } else {
    enc.varU64(0);
  }
  return ptrAndLen(enc.finish());
}

/** Calculate how many bytes were written to the output buffer. */
function outputLen(result: i64, offset: u32, maxLen: u32): u32 {
  if (result < 0) return 0;
  const total = u32(result);
  if (total <= offset) return 0;
  return min(maxLen, total - offset);
}

// --- Dispatch functions ---

/** Ecalli 0: gas(). No params. */
function dispatchGas(): u64 {
  const result = gas();
  logger.info(`gas() = ${result}`);
  return respond(result);
}

/** Ecalli 1: fetch(kind, param1, param2, offset, maxLen). */
function dispatchFetch(d: Decoder): u64 {
  const kind = u32(d.varU64());
  const param1 = u32(d.varU64());
  const param2 = u32(d.varU64());
  const offset = u32(d.varU64());
  const maxLen = u32(d.varU64());
  if (d.isError) {
    logger.warn("Failed to decode fetch params");
    return 0;
  }

  const buf = new Uint8Array(maxLen);
  const result = fetch(u32(buf.dataStart), offset, maxLen, kind, param1, param2);
  logger.info(`fetch(kind=${kind}) = ${result}`);

  return respond(result, buf.subarray(0, outputLen(result, offset, maxLen)));
}

/** Ecalli 2: lookup(service, hash[32], offset, maxLen). */
function dispatchLookup(d: Decoder): u64 {
  const service = u32(d.varU64());
  const hash = d.bytes32();
  const offset = u32(d.varU64());
  const maxLen = u32(d.varU64());
  if (d.isError) {
    logger.warn("Failed to decode lookup params");
    return 0;
  }

  const buf = new Uint8Array(maxLen);
  const result = lookup(service, u32(hash.raw.dataStart), u32(buf.dataStart), offset, maxLen);
  logger.info(`lookup() = ${result}`);

  return respond(result, buf.subarray(0, outputLen(result, offset, maxLen)));
}

/** Ecalli 3: read(service, key[bytesVarLen], offset, maxLen). */
function dispatchRead(d: Decoder): u64 {
  const service = u32(d.varU64());
  const key = d.bytesVarLen();
  const offset = u32(d.varU64());
  const maxLen = u32(d.varU64());
  if (d.isError) {
    logger.warn("Failed to decode read params");
    return 0;
  }

  const buf = new Uint8Array(maxLen);
  const result = read(service, u32(key.raw.dataStart), key.raw.byteLength, u32(buf.dataStart), offset, maxLen);
  logger.info(`read() = ${result}`);

  return respond(result, buf.subarray(0, outputLen(result, offset, maxLen)));
}

/** Ecalli 4: write(key[bytesVarLen], value[bytesVarLen]). */
function dispatchWrite(d: Decoder): u64 {
  const key = d.bytesVarLen();
  const value = d.bytesVarLen();
  if (d.isError) {
    logger.warn("Failed to decode write params");
    return 0;
  }

  const result = write(u32(key.raw.dataStart), key.raw.byteLength, u32(value.raw.dataStart), value.raw.byteLength);
  logger.info(`write() = ${result}`);

  return respond(result);
}

/** Ecalli 5: info(service, offset, maxLen). */
function dispatchInfo(d: Decoder): u64 {
  const service = u32(d.varU64());
  const offset = u32(d.varU64());
  const maxLen = u32(d.varU64());
  if (d.isError) {
    logger.warn("Failed to decode info params");
    return 0;
  }

  const buf = new Uint8Array(maxLen);
  const result = info(service, u32(buf.dataStart), offset, maxLen);
  logger.info(`info() = ${result}`);

  return respond(result, buf.subarray(0, outputLen(result, offset, maxLen)));
}

/** Ecalli 100: log(level, target[bytesVarLen], message[bytesVarLen]). */
function dispatchLog(d: Decoder): u64 {
  const level = u32(d.varU64());
  const target = d.bytesVarLen();
  const message = d.bytesVarLen();
  if (d.isError) {
    logger.warn("Failed to decode log params");
    return 0;
  }

  const result = log(
    level,
    u32(target.raw.dataStart),
    target.raw.byteLength,
    u32(message.raw.dataStart),
    message.raw.byteLength,
  );
  logger.info(`log(level=${level}) = ${result}`);

  return respond(i64(result));
}
