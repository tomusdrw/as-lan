import {
  Decoder,
  export_,
  expunge,
  historical_lookup,
  invoke,
  machine,
  pages,
  peek,
  poke,
  Response,
} from "@fluffylabs/as-lan";
import { logger, outputLen } from "./common";

/** Ecalli 6: historical_lookup(service, hash[32], offset, maxLen). */
export function dispatchHistoricalLookup(d: Decoder): u64 {
  const service = u32(d.varU64());
  const hash = d.bytes32();
  const offset = u32(d.varU64());
  const maxLen = u32(d.varU64());
  if (d.isError) {
    logger.warn("Failed to decode historical_lookup params");
    return 0;
  }

  const buf = new Uint8Array(maxLen);
  const result = historical_lookup(service, u32(hash.raw.dataStart), u32(buf.dataStart), offset, maxLen);
  logger.info(`historical_lookup() = ${result}`);

  return Response.with(result, buf.subarray(0, outputLen(result, offset, maxLen)));
}

/** Ecalli 7: export_(segment[bytesVarLen]). */
export function dispatchExport(d: Decoder): u64 {
  const segment = d.bytesVarLen();
  if (d.isError) {
    logger.warn("Failed to decode export params");
    return 0;
  }

  const result = export_(u32(segment.raw.dataStart), segment.raw.byteLength);
  logger.info(`export() = ${result}`);

  return Response.with(result);
}

/** Ecalli 8: machine(code[bytesVarLen], entrypoint). */
export function dispatchMachine(d: Decoder): u64 {
  const code = d.bytesVarLen();
  const entrypoint = u32(d.varU64());
  if (d.isError) {
    logger.warn("Failed to decode machine params");
    return 0;
  }

  const result = machine(u32(code.raw.dataStart), code.raw.byteLength, entrypoint);
  logger.info(`machine() = ${result}`);

  return Response.with(result);
}

/** Ecalli 9: peek(machine_id, source, length). */
export function dispatchPeek(d: Decoder): u64 {
  const machineId = u32(d.varU64());
  const source = u32(d.varU64());
  const length = u32(d.varU64());
  if (d.isError) {
    logger.warn("Failed to decode peek params");
    return 0;
  }

  const buf = new Uint8Array(length);
  const result = peek(machineId, u32(buf.dataStart), source, length);
  logger.info(`peek() = ${result}`);

  if (result === 0) {
    return Response.with(result, buf);
  }
  return Response.with(result);
}

/** Ecalli 10: poke(machine_id, data[bytesVarLen], dest). */
export function dispatchPoke(d: Decoder): u64 {
  const machineId = u32(d.varU64());
  const data = d.bytesVarLen();
  const dest = u32(d.varU64());
  if (d.isError) {
    logger.warn("Failed to decode poke params");
    return 0;
  }

  const result = poke(machineId, u32(data.raw.dataStart), dest, data.raw.byteLength);
  logger.info(`poke() = ${result}`);

  return Response.with(result);
}

/** Ecalli 11: pages(machine_id, start_page, page_count, access_type). */
export function dispatchPages(d: Decoder): u64 {
  const machineId = u32(d.varU64());
  const startPage = u32(d.varU64());
  const pageCount = u32(d.varU64());
  const accessType = u32(d.varU64());
  if (d.isError) {
    logger.warn("Failed to decode pages params");
    return 0;
  }

  const result = pages(machineId, startPage, pageCount, accessType);
  logger.info(`pages() = ${result}`);

  return Response.with(result);
}

/** Ecalli 12: invoke(machine_id, io[bytesVarLen]). Returns exit reason + r8. */
export function dispatchInvoke(d: Decoder): u64 {
  const machineId = u32(d.varU64());
  const io = d.bytesVarLen();
  if (d.isError) {
    logger.warn("Failed to decode invoke params");
    return 0;
  }

  const outR8 = new Uint8Array(8);
  const result = invoke(machineId, u32(io.raw.dataStart), u32(outR8.dataStart));
  logger.info(`invoke() = ${result}`);

  return Response.with(result, outR8);
}

/** Ecalli 13: expunge(machine_id). */
export function dispatchExpunge(d: Decoder): u64 {
  const machineId = u32(d.varU64());
  if (d.isError) {
    logger.warn("Failed to decode expunge params");
    return 0;
  }

  const result = expunge(machineId);
  logger.info(`expunge() = ${result}`);

  return Response.with(result);
}
