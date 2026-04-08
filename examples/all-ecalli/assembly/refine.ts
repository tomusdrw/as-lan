import {
  Bytes32,
  BytesBlob,
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

const CURRENT_SERVICE: u32 = u32.MAX_VALUE;

/**
 * Refine entry point that invokes every host call available in the refine
 * context (general 0-5, 100 + refine 6-13) one by one with sensible
 * parameters, collecting results into the response.
 */
export function refine(ptr: u32, len: u32): u64 {
  const ctx = RefineContext.create();
  const args = ctx.parseArgs(ptr, len);
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
  count += fetchAll(out, FetchKind.AuthConfig, "AuthConfig", 0, 0);
  count += fetchAll(out, FetchKind.AuthToken, "AuthToken", 0, 0);
  count += fetchAll(out, FetchKind.RefineContext, "RefineContext", 0, 0);
  count += fetchAll(out, FetchKind.AllWorkItems, "AllWorkItems", 0, 0);
  count += fetchAll(out, FetchKind.OneWorkItem, "OneWorkItem", 0, 0);
  count += fetchAll(out, FetchKind.WorkItemPayload, "WorkItemPayload", 0, 0);

  // ─── Ecalli 2: lookup(current service, zero hash) ─────────────────
  {
    const hash = Bytes32.zero();
    const buf = BytesBlob.zero(256);
    const r = lookup(CURRENT_SERVICE, hash.ptr(), buf.ptr(), 0, buf.length);
    logger.info(`[2] lookup() = ${r}`);
    out.varU64(2);
    out.u64(r);
    count++;
  }

  // ─── Ecalli 3: read(current service, key="test") ──────────────────
  {
    const key = BytesBlob.encodeAscii("test");
    const buf = BytesBlob.zero(256);
    const r = read(CURRENT_SERVICE, key.ptr(), key.length, buf.ptr(), 0, buf.length);
    logger.info(`[3] read() = ${r}`);
    out.varU64(3);
    out.u64(r);
    count++;
  }

  // ─── Ecalli 4: write(key="smoke", value="ok") ─────────────────────
  {
    const key = BytesBlob.encodeAscii("smoke");
    const val = BytesBlob.encodeAscii("ok");
    const r = write(key.ptr(), key.length, val.ptr(), val.length);
    logger.info(`[4] write() = ${r}`);
    out.varU64(4);
    out.u64(r);
    count++;
  }

  // ─── Ecalli 5: info(current service) ──────────────────────────────
  {
    const buf = BytesBlob.zero(96);
    const r = info(CURRENT_SERVICE, buf.ptr(), 0, buf.length);
    logger.info(`[5] info() = ${r}`);
    out.varU64(5);
    out.u64(r);
    count++;
  }

  // ─── Ecalli 100: log(level=3 helpful) ─────────────────────────────
  {
    const target = BytesBlob.encodeAscii("all-ecalli");
    const message = BytesBlob.encodeAscii("smoke test");
    const r = log(3, target.ptr(), target.length, message.ptr(), message.length);
    logger.info(`[100] log() = ${r}`);
    out.varU64(100);
    out.u64(u64(r));
    count++;
  }

  // ─── Ecalli 6: historical_lookup(current service, zero hash) ──────
  {
    const hash = Bytes32.zero();
    const buf = BytesBlob.zero(256);
    const r = historical_lookup(CURRENT_SERVICE, hash.ptr(), buf.ptr(), 0, buf.length);
    logger.info(`[6] historical_lookup() = ${r}`);
    out.varU64(6);
    out.u64(r);
    count++;
  }

  // ─── Ecalli 7: export_(segment) ───────────────────────────────────
  {
    const segment = BytesBlob.zero(16);
    segment.raw[0] = 0xab;
    segment.raw[1] = 0xcd;
    const r = export_(segment.ptr(), segment.length);
    logger.info(`[7] export() = ${r}`);
    out.varU64(7);
    out.u64(r);
    count++;
  }

  // ─── Ecalli 8: machine(code, entrypoint=0) ────────────────────────
  const machineCode = BytesBlob.zero(4);
  let machineId: i64;
  {
    const r = machine(machineCode.ptr(), machineCode.length, 0);
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
    const data = BytesBlob.zero(4);
    data.raw[0] = 0xde;
    data.raw[1] = 0xad;
    data.raw[2] = 0xbe;
    data.raw[3] = 0xef;
    const r = poke(u32(machineId), data.ptr(), 0, data.length);
    logger.info(`[10] poke() = ${r}`);
    out.varU64(10);
    out.u64(r);
    count++;
  }

  // ─── Ecalli 9: peek(machine, source=0, len=4) ─────────────────────
  {
    const buf = BytesBlob.zero(4);
    const r = peek(u32(machineId), buf.ptr(), 0, buf.length);
    logger.info(`[9] peek() = ${r}`);
    out.varU64(9);
    out.u64(r);
    count++;
  }

  // ─── Ecalli 12: invoke(machine, io) ───────────────────────────────
  {
    const io = BytesBlob.zero(8);
    const outR8 = BytesBlob.zero(8);
    const r = invoke(u32(machineId), io.ptr(), outR8.ptr());
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
  const buf = BytesBlob.zero(256);
  const r = fetch(buf.ptr(), 0, buf.length, kind, param1, param2);
  logger.info(`[1] fetch(${name}) = ${r}`);
  out.varU64(1);
  out.u64(r);
  return 1;
}
