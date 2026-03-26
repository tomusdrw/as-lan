import {
  Encoder,
  export_,
  expunge,
  FetchKind,
  fetch,
  // General ecallis (0-5, 100)
  gas,
  // Refine ecallis (6-13)
  historical_lookup,
  info,
  invoke,
  Logger,
  log,
  lookup,
  machine,
  pages,
  peek,
  poke,
  RefineContext,
  Response,
  read,
  write,
} from "@fluffylabs/as-lan";

const logger: Logger = Logger.create("all-ecalli");

/**
 * Refine entry point that invokes every host call available in the refine
 * context (general 0-5, 100 + refine 6-13) one by one with sensible
 * parameters, collecting results into the response.
 */
export function refine(ptr: u32, len: u32): u64 {
  const ctx = RefineContext.create();
  const result = ctx.parseArgs(ptr, len);
  if (result.isError) {
    logger.warn(`Failed to parse refine args: ${result.error}`);
    return 0;
  }

  const args = result.okay!;
  logger.info(`refine: service=${args.serviceId} core=${args.coreIndex} item=${args.itemIndex}`);

  const out = Encoder.create();
  let count: u32 = 0;

  // ─── Ecalli 0: gas() ──────────────────────────────────────────────
  {
    const r = gas();
    logger.info(`[0] gas() = ${r}`);
    out.varU64(u64(0));
    out.u64(r);
    count++;
  }

  // ─── Ecalli 1: fetch — all refine-context kinds (0-13) ─────────────
  count += fetchAll(out, FetchKind.Constants, "Constants", 0, 0);
  count += fetchAll(out, FetchKind.Entropy, "Entropy", 0, 0);
  count += fetchAll(out, FetchKind.AuthorizerTrace, "AuthorizerTrace", 0, 0);
  count += fetchAll(out, FetchKind.OtherWorkItemExtrinsics, "OtherWorkItemExtrinsics", 0, 0);
  count += fetchAll(out, FetchKind.MyExtrinsics, "MyExtrinsics", 0, 0);
  count += fetchAll(out, FetchKind.OtherWorkItemImports, "OtherWorkItemImports", 0, 0);
  count += fetchAll(out, FetchKind.MyImports, "MyImports", 0, 0);
  count += fetchAll(out, FetchKind.WorkPackage, "WorkPackage", 0, 0);
  count += fetchAll(out, FetchKind.Authorizer, "Authorizer", 0, 0);
  count += fetchAll(out, FetchKind.AuthorizationToken, "AuthorizationToken", 0, 0);
  count += fetchAll(out, FetchKind.RefineContext, "RefineContext", 0, 0);
  count += fetchAll(out, FetchKind.AllWorkItems, "AllWorkItems", 0, 0);
  count += fetchAll(out, FetchKind.OneWorkItem, "OneWorkItem", 0, 0);
  count += fetchAll(out, FetchKind.WorkItemPayload, "WorkItemPayload", 0, 0);

  // ─── Ecalli 2: lookup(current service, zero hash) ─────────────────
  {
    const hash = new Uint8Array(32);
    const buf = new Uint8Array(256);
    const r = lookup(u32.MAX_VALUE, u32(hash.dataStart), u32(buf.dataStart), 0, 256);
    logger.info(`[2] lookup() = ${r}`);
    out.varU64(2);
    out.u64(r);
    count++;
  }

  // ─── Ecalli 3: read(current service, key="test") ──────────────────
  {
    const key = encodeString("test");
    const buf = new Uint8Array(256);
    const r = read(u32.MAX_VALUE, u32(key.dataStart), key.byteLength, u32(buf.dataStart), 0, 256);
    logger.info(`[3] read() = ${r}`);
    out.varU64(3);
    out.u64(r);
    count++;
  }

  // ─── Ecalli 4: write(key="smoke", value="ok") ─────────────────────
  {
    const key = encodeString("smoke");
    const val = encodeString("ok");
    const r = write(u32(key.dataStart), key.byteLength, u32(val.dataStart), val.byteLength);
    logger.info(`[4] write() = ${r}`);
    out.varU64(4);
    out.u64(r);
    count++;
  }

  // ─── Ecalli 5: info(current service) ──────────────────────────────
  {
    const buf = new Uint8Array(96);
    const r = info(u32.MAX_VALUE, u32(buf.dataStart), 0, 96);
    logger.info(`[5] info() = ${r}`);
    out.varU64(5);
    out.u64(r);
    count++;
  }

  // ─── Ecalli 100: log(level=3 helpful) ─────────────────────────────
  {
    const target = encodeString("all-ecalli");
    const message = encodeString("smoke test");
    const r = log(3, u32(target.dataStart), target.byteLength, u32(message.dataStart), message.byteLength);
    logger.info(`[100] log() = ${r}`);
    out.varU64(100);
    out.u64(i64(r));
    count++;
  }

  // ─── Ecalli 6: historical_lookup(current service, zero hash) ──────
  {
    const hash = new Uint8Array(32);
    const buf = new Uint8Array(256);
    const r = historical_lookup(u32.MAX_VALUE, u32(hash.dataStart), u32(buf.dataStart), 0, 256);
    logger.info(`[6] historical_lookup() = ${r}`);
    out.varU64(6);
    out.u64(r);
    count++;
  }

  // ─── Ecalli 7: export_(segment) ───────────────────────────────────
  {
    const segment = new Uint8Array(16);
    segment[0] = 0xab;
    segment[1] = 0xcd;
    const r = export_(u32(segment.dataStart), segment.byteLength);
    logger.info(`[7] export() = ${r}`);
    out.varU64(7);
    out.u64(r);
    count++;
  }

  // ─── Ecalli 8: machine(code, entrypoint=0) ────────────────────────
  const machineCode = new Uint8Array(4);
  let machineId: i64;
  {
    const r = machine(u32(machineCode.dataStart), machineCode.byteLength, 0);
    machineId = r;
    logger.info(`[8] machine() = ${r}`);
    out.varU64(8);
    out.u64(r);
    count++;
  }

  // ─── Ecalli 11: pages(machine, page=0, count=1, rw=3) ────────────
  {
    const r = pages(u32(machineId), 0, 1, 3);
    logger.info(`[11] pages() = ${r}`);
    out.varU64(11);
    out.u64(r);
    count++;
  }

  // ─── Ecalli 10: poke(machine, data, dest=0) ───────────────────────
  {
    const data = new Uint8Array(4);
    data[0] = 0xde;
    data[1] = 0xad;
    data[2] = 0xbe;
    data[3] = 0xef;
    const r = poke(u32(machineId), u32(data.dataStart), 0, data.byteLength);
    logger.info(`[10] poke() = ${r}`);
    out.varU64(10);
    out.u64(r);
    count++;
  }

  // ─── Ecalli 9: peek(machine, source=0, len=4) ─────────────────────
  {
    const buf = new Uint8Array(4);
    const r = peek(u32(machineId), u32(buf.dataStart), 0, buf.byteLength);
    logger.info(`[9] peek() = ${r}`);
    out.varU64(9);
    out.u64(r);
    count++;
  }

  // ─── Ecalli 12: invoke(machine, io) ───────────────────────────────
  {
    const io = new Uint8Array(8);
    const outR8 = new Uint8Array(8);
    const r = invoke(u32(machineId), u32(io.dataStart), u32(outR8.dataStart));
    logger.info(`[12] invoke() = ${r}`);
    out.varU64(12);
    out.u64(r);
    count++;
  }

  // ─── Ecalli 13: expunge(machine) ──────────────────────────────────
  {
    const r = expunge(u32(machineId));
    logger.info(`[13] expunge() = ${r}`);
    out.varU64(13);
    out.u64(r);
    count++;
  }

  logger.info(`refine complete: ${count} ecallis invoked`);

  // Encode count at front, then the collected results
  const results = out.finish();
  const finalEnc = Encoder.create();
  finalEnc.varU64(u64(count));
  finalEnc.bytesFixLen(results);
  return Response.with(i64(count), finalEnc.finish());
}

/** Call fetch with the given kind and record the result. Returns 1. */
function fetchAll(out: Encoder, kind: u32, name: string, param1: u32, param2: u32): u32 {
  const buf = new Uint8Array(256);
  const r = fetch(u32(buf.dataStart), 0, 256, kind, param1, param2);
  logger.info(`[1] fetch(${name}) = ${r}`);
  out.varU64(1);
  out.u64(r);
  return 1;
}

/** Encode a string as a Uint8Array (UTF-8). */
function encodeString(s: string): Uint8Array {
  const buf = String.UTF8.encode(s);
  return Uint8Array.wrap(buf);
}
