import { Decoder, fetch, gas, info, log, lookup, Response, read, write } from "@fluffylabs/as-lan";
import { logger, outputLen } from "./common";

/** Ecalli 0: gas(). No params. */
export function dispatchGas(): u64 {
  const result = gas();
  logger.info(`gas() = ${result}`);
  return Response.with(result);
}

/** Ecalli 1: fetch(kind, param1, param2, offset, maxLen). */
export function dispatchFetch(d: Decoder): u64 {
  const kind = d.varU32();
  const param1 = d.varU32();
  const param2 = d.varU32();
  const offset = d.varU32();
  const maxLen = d.varU32();
  if (d.isError) {
    logger.warn("Failed to decode fetch params");
    return 0;
  }

  const buf = new Uint8Array(maxLen);
  const result = fetch(u32(buf.dataStart), offset, maxLen, kind, param1, param2);
  logger.info(`fetch(kind=${kind}) = ${result}`);

  return Response.with(result, buf.subarray(0, outputLen(result, offset, maxLen)));
}

/** Ecalli 2: lookup(service, hash[32], offset, maxLen). */
export function dispatchLookup(d: Decoder): u64 {
  const service = d.varU32();
  const hash = d.bytes32();
  const offset = d.varU32();
  const maxLen = d.varU32();
  if (d.isError) {
    logger.warn("Failed to decode lookup params");
    return 0;
  }

  const buf = new Uint8Array(maxLen);
  const result = lookup(service, u32(hash.raw.dataStart), u32(buf.dataStart), offset, maxLen);
  logger.info(`lookup() = ${result}`);

  return Response.with(result, buf.subarray(0, outputLen(result, offset, maxLen)));
}

/** Ecalli 3: read(service, key[bytesVarLen], offset, maxLen). */
export function dispatchRead(d: Decoder): u64 {
  const service = d.varU32();
  const key = d.bytesVarLen();
  const offset = d.varU32();
  const maxLen = d.varU32();
  if (d.isError) {
    logger.warn("Failed to decode read params");
    return 0;
  }

  const buf = new Uint8Array(maxLen);
  const result = read(service, u32(key.raw.dataStart), key.raw.byteLength, u32(buf.dataStart), offset, maxLen);
  logger.info(`read() = ${result}`);

  return Response.with(result, buf.subarray(0, outputLen(result, offset, maxLen)));
}

/** Ecalli 4: write(key[bytesVarLen], value[bytesVarLen]). */
export function dispatchWrite(d: Decoder): u64 {
  const key = d.bytesVarLen();
  const value = d.bytesVarLen();
  if (d.isError) {
    logger.warn("Failed to decode write params");
    return 0;
  }

  const result = write(u32(key.raw.dataStart), key.raw.byteLength, u32(value.raw.dataStart), value.raw.byteLength);
  logger.info(`write() = ${result}`);

  return Response.with(result);
}

/** Ecalli 5: info(service, offset, maxLen). */
export function dispatchInfo(d: Decoder): u64 {
  const service = d.varU32();
  const offset = d.varU32();
  const maxLen = d.varU32();
  if (d.isError) {
    logger.warn("Failed to decode info params");
    return 0;
  }

  const buf = new Uint8Array(maxLen);
  const result = info(service, u32(buf.dataStart), offset, maxLen);
  logger.info(`info() = ${result}`);

  return Response.with(result, buf.subarray(0, outputLen(result, offset, maxLen)));
}

/** Ecalli 100: log(level, target[bytesVarLen], message[bytesVarLen]). */
export function dispatchLog(d: Decoder): u64 {
  const level = d.varU32();
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

  return Response.with(i64(result));
}
