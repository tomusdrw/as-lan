import {
  AccumulateArgs,
  Bytes32,
  BytesBlob,
  Encoder,
  Operand,
  PendingTransfer,
  RefineArgs,
  Response,
  WorkExecResult,
  WorkExecResultKind,
} from "@fluffylabs/as-lan";
import { TestAccumulate, unpackResult } from "@fluffylabs/as-lan/test";
import { accumulate } from "./accumulate";
import { refine } from "./refine";

// Re-export SDK helpers for use by test files.
export { Response } from "@fluffylabs/as-lan";
export { strBlob, unpackResult } from "@fluffylabs/as-lan/test";

// --- Refine helpers ---

/** Call refine with the given ecalli dispatch payload. */
export function callRefine(payload: Uint8Array): Response {
  const args = RefineArgs.create(0, 0, 42, BytesBlob.wrap(payload), Bytes32.wrapUnchecked(new Uint8Array(32)));
  const enc = Encoder.create();
  args.encode(enc);
  const encoded = enc.finish();
  const buf = new Uint8Array(encoded.length);
  buf.set(encoded);
  const raw = unpackResult(refine(u32(buf.dataStart), buf.byteLength));
  return Response.decode(raw);
}

// --- Accumulate helpers ---

const ZERO_HASH: Bytes32 = Bytes32.wrapUnchecked(new Uint8Array(32));

/** Call accumulate with the given number of pre-set items. */
export function callAccumulate(argsLength: u32): Uint8Array {
  const args = AccumulateArgs.create(7, 42, argsLength);
  const enc = Encoder.create();
  args.encode(enc);
  const encoded = enc.finish();
  const buf = new Uint8Array(encoded.length);
  buf.set(encoded);
  return unpackResult(accumulate(u32(buf.dataStart), buf.byteLength));
}

/** Encode a tagged transfer item. */
export function buildTransferItem(source: u32, dest: u32, amount: u64, gas: u64): Uint8Array {
  const tx = PendingTransfer.create(source, dest, amount, BytesBlob.empty(), gas);
  const enc = Encoder.create();
  tx.encodeTagged(enc);
  return enc.finish();
}

/**
 * Set up an operand whose okBlob dispatches the given ecalli, then call accumulate.
 * Returns the decoded Response from the dispatch.
 */
export function callAccumulateWithOperand(ecalliPayload: Uint8Array): Response {
  const op = Operand.create(
    ZERO_HASH,
    ZERO_HASH,
    ZERO_HASH,
    ZERO_HASH,
    100000,
    WorkExecResult.create(WorkExecResultKind.Ok, BytesBlob.wrap(ecalliPayload)),
    BytesBlob.empty(),
  );
  const enc = Encoder.create();
  op.encodeTagged(enc);
  const item = enc.finish();
  TestAccumulate.setItem(0, item);
  const raw = callAccumulate(1);
  return Response.decode(raw);
}
