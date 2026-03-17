import {
  assign,
  bless,
  checkpoint,
  Decoder,
  designate,
  eject,
  forget,
  new_service,
  provide,
  query,
  Response,
  solicit,
  TRANSFER_MEMO_SIZE,
  transfer,
  upgrade,
  yield_result,
} from "@fluffylabs/as-lan";
import { logger } from "./common";

/** Ecalli 14: bless(manager, auth_queue[bytesVarLen], delegator, registrar, auto_accum[bytesVarLen], count). */
export function dispatchBless(d: Decoder): u64 {
  const manager = u32(d.varU64());
  const authQueue = d.bytesVarLen();
  const delegator = u32(d.varU64());
  const registrar = u32(d.varU64());
  const autoAccum = d.bytesVarLen();
  const autoAccumCount = u32(d.varU64());
  if (d.isError) {
    logger.warn("Failed to decode bless params");
    return 0;
  }

  const result = bless(
    manager,
    u32(authQueue.raw.dataStart),
    delegator,
    registrar,
    u32(autoAccum.raw.dataStart),
    autoAccumCount,
  );
  logger.info(`bless() = ${result}`);

  return Response.with(result);
}

/** Ecalli 15: assign(core, auth_queue[bytesVarLen], assigners). */
export function dispatchAssign(d: Decoder): u64 {
  const core = u32(d.varU64());
  const authQueue = d.bytesVarLen();
  const assigners = u32(d.varU64());
  if (d.isError) {
    logger.warn("Failed to decode assign params");
    return 0;
  }

  const result = assign(core, u32(authQueue.raw.dataStart), assigners);
  logger.info(`assign() = ${result}`);

  return Response.with(result);
}

/** Ecalli 16: designate(validators[bytesVarLen]). */
export function dispatchDesignate(d: Decoder): u64 {
  const validators = d.bytesVarLen();
  if (d.isError) {
    logger.warn("Failed to decode designate params");
    return 0;
  }

  const result = designate(u32(validators.raw.dataStart));
  logger.info(`designate() = ${result}`);

  return Response.with(result);
}

/** Ecalli 17: checkpoint(). No params. */
export function dispatchCheckpoint(): u64 {
  const result = checkpoint();
  logger.info(`checkpoint() = ${result}`);

  return Response.with(result);
}

/** Ecalli 18: new_service(code_hash[32], code_len, gas, allowance, gratis_storage, requested_id). */
export function dispatchNewService(d: Decoder): u64 {
  const codeHash = d.bytes32();
  const codeLen = u32(d.varU64());
  const minGas = d.varU64();
  const allowance = d.varU64();
  const gratisStorage = u32(d.varU64());
  const requestedId = u32(d.varU64());
  if (d.isError) {
    logger.warn("Failed to decode new_service params");
    return 0;
  }

  const result = new_service(u32(codeHash.raw.dataStart), codeLen, minGas, allowance, gratisStorage, requestedId);
  logger.info(`new_service() = ${result}`);

  return Response.with(result);
}

/** Ecalli 19: upgrade(code_hash[32], gas, allowance). */
export function dispatchUpgrade(d: Decoder): u64 {
  const codeHash = d.bytes32();
  const minGas = d.varU64();
  const allowance = d.varU64();
  if (d.isError) {
    logger.warn("Failed to decode upgrade params");
    return 0;
  }

  const result = upgrade(u32(codeHash.raw.dataStart), minGas, allowance);
  logger.info(`upgrade() = ${result}`);

  return Response.with(result);
}

/** Ecalli 20: transfer(dest, amount, gas_fee, memo[bytesVarLen]). */
export function dispatchTransfer(d: Decoder): u64 {
  const dest = u32(d.varU64());
  const amount = d.varU64();
  const gasFee = d.varU64();
  const memo = d.bytesVarLen();
  if (d.isError) {
    logger.warn("Failed to decode transfer params");
    return 0;
  }

  // Pad memo to exactly TRANSFER_MEMO_SIZE bytes as required by the host call.
  const padded = new Uint8Array(TRANSFER_MEMO_SIZE);
  const raw = memo.raw;
  padded.set(raw.subarray(0, min(<i32>raw.length, <i32>TRANSFER_MEMO_SIZE)));
  const result = transfer(dest, amount, gasFee, u32(padded.dataStart));
  logger.info(`transfer() = ${result}`);

  return Response.with(result);
}

/** Ecalli 21: eject(service, prev_code_hash[32]). */
export function dispatchEject(d: Decoder): u64 {
  const service = u32(d.varU64());
  const prevCodeHash = d.bytes32();
  if (d.isError) {
    logger.warn("Failed to decode eject params");
    return 0;
  }

  const result = eject(service, u32(prevCodeHash.raw.dataStart));
  logger.info(`eject() = ${result}`);

  return Response.with(result);
}

/** Ecalli 22: query(hash[32], length). Returns result + r8. */
export function dispatchQuery(d: Decoder): u64 {
  const hash = d.bytes32();
  const length = u32(d.varU64());
  if (d.isError) {
    logger.warn("Failed to decode query params");
    return 0;
  }

  const outR8 = new Uint8Array(8);
  const result = query(u32(hash.raw.dataStart), length, u32(outR8.dataStart));
  logger.info(`query() = ${result}`);

  return Response.with(result, outR8);
}

/** Ecalli 23: solicit(hash[32], length). */
export function dispatchSolicit(d: Decoder): u64 {
  const hash = d.bytes32();
  const length = u32(d.varU64());
  if (d.isError) {
    logger.warn("Failed to decode solicit params");
    return 0;
  }

  const result = solicit(u32(hash.raw.dataStart), length);
  logger.info(`solicit() = ${result}`);

  return Response.with(result);
}

/** Ecalli 24: forget(hash[32], length). */
export function dispatchForget(d: Decoder): u64 {
  const hash = d.bytes32();
  const length = u32(d.varU64());
  if (d.isError) {
    logger.warn("Failed to decode forget params");
    return 0;
  }

  const result = forget(u32(hash.raw.dataStart), length);
  logger.info(`forget() = ${result}`);

  return Response.with(result);
}

/** Ecalli 25: yield_result(hash[32]). */
export function dispatchYieldResult(d: Decoder): u64 {
  const hash = d.bytes32();
  if (d.isError) {
    logger.warn("Failed to decode yield_result params");
    return 0;
  }

  const result = yield_result(u32(hash.raw.dataStart));
  logger.info(`yield_result() = ${result}`);

  return Response.with(result);
}

/** Ecalli 26: provide(service, preimage[bytesVarLen]). */
export function dispatchProvide(d: Decoder): u64 {
  const service = u32(d.varU64());
  const preimage = d.bytesVarLen();
  if (d.isError) {
    logger.warn("Failed to decode provide params");
    return 0;
  }

  const result = provide(service, u32(preimage.raw.dataStart), preimage.raw.byteLength);
  logger.info(`provide() = ${result}`);

  return Response.with(result);
}
