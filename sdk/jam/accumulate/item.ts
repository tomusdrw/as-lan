/**
 * Types for accumulate-context items: operands (work results) and transfers.
 *
 * During accumulation, services call `fetch(kind=15, index)` to retrieve items.
 * Each item is a tagged union: tag=0 for operand, tag=1 for transfer.
 *
 * @see https://graypaper.fluffylabs.dev
 */

import { Bytes32, BytesBlob } from "../../core/bytes";
import { DecodeError, Decoder, TryDecode } from "../../core/codec/decode";
import { Encoder, TryEncode } from "../../core/codec/encode";
import { Result } from "../../core/result";

/** Discriminator tag for accumulate items. */
export enum AccumulateItemKind {
  /** Work result from the refine phase. */
  Operand = 0,
  /** Incoming balance transfer from another service. */
  Transfer = 1,
}

/** Outcome of work-item refinement. */
export enum WorkExecResultKind {
  /** Successful execution — followed by output blob. */
  Ok = 0,
  /** Ran out of gas. */
  OutOfGas = 1,
  /** Unexpected termination (panic). */
  Panic = 2,
  /** Incorrect number of exported segments. */
  IncorrectNumberOfExports = 3,
  /** Digest too large. */
  DigestTooBig = 4,
  /** Code not available in state. */
  BadCode = 5,
  /** Code exceeds maximum size. */
  CodeOversize = 6,
}

// ─── WorkExecResult ───────────────────────────────────────────────────

/** Result of work-item execution during refine. */
export class WorkExecResult {
  static create(kind: WorkExecResultKind, okBlob: BytesBlob): WorkExecResult {
    return new WorkExecResult(kind, okBlob);
  }

  private constructor(
    public kind: WorkExecResultKind,
    /** Output blob — only present when kind == Ok. */
    public okBlob: BytesBlob,
  ) {}

  get isOk(): bool {
    return this.kind === WorkExecResultKind.Ok;
  }
}

export class WorkExecResultCodec implements TryDecode<WorkExecResult>, TryEncode<WorkExecResult> {
  static create(): WorkExecResultCodec { return new WorkExecResultCodec(); }
  private constructor() {}

  decode(d: Decoder): Result<WorkExecResult, DecodeError> {
    const kind = d.varU32();
    if (d.isError) return Result.err<WorkExecResult, DecodeError>(DecodeError.MissingBytes);
    if (kind > u32(WorkExecResultKind.CodeOversize)) {
      return Result.err<WorkExecResult, DecodeError>(DecodeError.InvalidData);
    }
    if (kind === WorkExecResultKind.Ok) {
      const blob = d.bytesVarLen();
      if (d.isError) return Result.err<WorkExecResult, DecodeError>(DecodeError.MissingBytes);
      return Result.ok<WorkExecResult, DecodeError>(WorkExecResult.create(kind, blob));
    }
    return Result.ok<WorkExecResult, DecodeError>(WorkExecResult.create(kind, BytesBlob.empty()));
  }

  encode(v: WorkExecResult, e: Encoder): void {
    e.varU64(u64(v.kind));
    if (v.kind === WorkExecResultKind.Ok) {
      e.bytesVarLen(v.okBlob);
    }
  }
}

export const workExecResultCodec = WorkExecResultCodec.create();

// ─── Operand ──────────────────────────────────────────────────────────

/**
 * Operand: a work result from the refine phase.
 *
 * Encoding order matches the Gray Paper / typeberry codec:
 *   hash(32) + exportsRoot(32) + authorizerHash(32) + payloadHash(32)
 *   + gas(varU64) + result(WorkExecResult) + authorizationOutput(blob)
 */
export class Operand {
  static create(
    hash: Bytes32, exportsRoot: Bytes32, authorizerHash: Bytes32, payloadHash: Bytes32,
    gas: u64, result: WorkExecResult, authorizationOutput: BytesBlob,
  ): Operand {
    return new Operand(hash, exportsRoot, authorizerHash, payloadHash, gas, result, authorizationOutput);
  }

  private constructor(
    /** Work package hash. */
    public hash: Bytes32,
    /** Exports root hash. */
    public exportsRoot: Bytes32,
    /** Authorizer hash. */
    public authorizerHash: Bytes32,
    /** Payload hash from the work item. */
    public payloadHash: Bytes32,
    /** Gas allocated for accumulation. */
    public gas: u64,
    /** Refine execution result. */
    public result: WorkExecResult,
    /** Authorization output data. */
    public authorizationOutput: BytesBlob,
  ) {}
}

export class OperandCodec implements TryDecode<Operand>, TryEncode<Operand> {
  static create(): OperandCodec { return new OperandCodec(); }
  private constructor() {}

  decode(d: Decoder): Result<Operand, DecodeError> {
    const hash = d.bytes32();
    const exportsRoot = d.bytes32();
    const authorizerHash = d.bytes32();
    const payloadHash = d.bytes32();
    const gas = d.varU64();
    if (d.isError) return Result.err<Operand, DecodeError>(DecodeError.MissingBytes);
    const r = d.object<WorkExecResult>(workExecResultCodec);
    if (r.isError) return Result.err<Operand, DecodeError>(r.error);
    const authorizationOutput = d.bytesVarLen();
    if (d.isError) return Result.err<Operand, DecodeError>(DecodeError.MissingBytes);
    return Result.ok<Operand, DecodeError>(
      Operand.create(hash, exportsRoot, authorizerHash, payloadHash, gas, r.okay!, authorizationOutput),
    );
  }

  encode(v: Operand, e: Encoder): void {
    e.bytesFixLen(v.hash.raw);
    e.bytesFixLen(v.exportsRoot.raw);
    e.bytesFixLen(v.authorizerHash.raw);
    e.bytesFixLen(v.payloadHash.raw);
    e.varU64(v.gas);
    e.object<WorkExecResult>(workExecResultCodec, v.result);
    e.bytesVarLen(v.authorizationOutput);
  }
}

export const operandCodec = OperandCodec.create();

// ─── PendingTransfer ──────────────────────────────────────────────────

/** Size of the transfer memo field in bytes (W_T in the Gray Paper). */
export const TRANSFER_MEMO_SIZE: u32 = 128;

/**
 * Pending transfer from another service.
 *
 * Encoding order matches the Gray Paper / typeberry codec:
 *   source(u32 LE) + destination(u32 LE) + amount(u64 LE)
 *   + memo(128 bytes) + gas(u64 LE)
 */
export class PendingTransfer {
  static create(source: u32, destination: u32, amount: u64, memo: BytesBlob, gas: u64): PendingTransfer {
    return new PendingTransfer(source, destination, amount, memo, gas);
  }

  private constructor(
    /** Sending service ID. */
    public source: u32,
    /** Receiving service ID. */
    public destination: u32,
    /** Transfer amount. */
    public amount: u64,
    /** 128-byte memo. */
    public memo: BytesBlob,
    /** Gas allowance for the transfer. */
    public gas: u64,
  ) {}
}

export class PendingTransferCodec implements TryDecode<PendingTransfer>, TryEncode<PendingTransfer> {
  static create(): PendingTransferCodec { return new PendingTransferCodec(); }
  private constructor() {}

  decode(d: Decoder): Result<PendingTransfer, DecodeError> {
    const source = d.u32();
    const destination = d.u32();
    const amount = d.u64();
    const memo = d.bytesFixLen(TRANSFER_MEMO_SIZE);
    const gas = d.u64();
    if (d.isError) return Result.err<PendingTransfer, DecodeError>(DecodeError.MissingBytes);
    return Result.ok<PendingTransfer, DecodeError>(PendingTransfer.create(source, destination, amount, memo, gas));
  }

  encode(v: PendingTransfer, e: Encoder): void {
    e.u32(v.source);
    e.u32(v.destination);
    e.u64(v.amount);
    // Memo must be at most TRANSFER_MEMO_SIZE bytes; pad if shorter.
    const raw = v.memo.raw;
    assert(<u32>raw.length <= TRANSFER_MEMO_SIZE, `memo too large: ${raw.length} > ${TRANSFER_MEMO_SIZE}`);
    if (<u32>raw.length === TRANSFER_MEMO_SIZE) {
      e.bytesFixLen(raw);
    } else {
      const padded = new Uint8Array(TRANSFER_MEMO_SIZE);
      padded.set(raw);
      e.bytesFixLen(padded);
    }
    e.u64(v.gas);
  }
}

export const pendingTransferCodec = PendingTransferCodec.create();

// ─── AccumulateItem ───────────────────────────────────────────────────

/**
 * Discriminated union of accumulate items (operand or transfer).
 *
 * Use `isOperand` / `isTransfer` to check the kind, then access the
 * corresponding field via `.operand` or `.transfer`.
 */
export class AccumulateItem {
  private constructor(
    public readonly kind: AccumulateItemKind,
    private readonly _operand: Operand | null,
    private readonly _transfer: PendingTransfer | null,
  ) {}

  static fromOperand(op: Operand): AccumulateItem {
    return new AccumulateItem(AccumulateItemKind.Operand, op, null);
  }

  static fromTransfer(tx: PendingTransfer): AccumulateItem {
    return new AccumulateItem(AccumulateItemKind.Transfer, null, tx);
  }

  get isOperand(): bool {
    return this.kind === AccumulateItemKind.Operand;
  }

  get isTransfer(): bool {
    return this.kind === AccumulateItemKind.Transfer;
  }

  get operand(): Operand {
    assert(this._operand !== null, "AccumulateItem is not an operand");
    return this._operand!;
  }

  get transfer(): PendingTransfer {
    assert(this._transfer !== null, "AccumulateItem is not a transfer");
    return this._transfer!;
  }
}

export class AccumulateItemCodec implements TryDecode<AccumulateItem>, TryEncode<AccumulateItem> {
  static create(): AccumulateItemCodec { return new AccumulateItemCodec(); }
  private constructor() {}

  decode(d: Decoder): Result<AccumulateItem, DecodeError> {
    const tag = d.varU32();
    if (d.isError) return Result.err<AccumulateItem, DecodeError>(DecodeError.MissingBytes);
    if (tag === AccumulateItemKind.Operand) {
      const r = d.object<Operand>(operandCodec);
      if (r.isError) return Result.err<AccumulateItem, DecodeError>(r.error);
      return Result.ok<AccumulateItem, DecodeError>(AccumulateItem.fromOperand(r.okay!));
    }
    if (tag === AccumulateItemKind.Transfer) {
      const r = d.object<PendingTransfer>(pendingTransferCodec);
      if (r.isError) return Result.err<AccumulateItem, DecodeError>(r.error);
      return Result.ok<AccumulateItem, DecodeError>(AccumulateItem.fromTransfer(r.okay!));
    }
    return Result.err<AccumulateItem, DecodeError>(DecodeError.InvalidData);
  }

  encode(v: AccumulateItem, e: Encoder): void {
    if (v.isOperand) {
      e.varU64(AccumulateItemKind.Operand);
      e.object<Operand>(operandCodec, v.operand);
    } else {
      e.varU64(AccumulateItemKind.Transfer);
      e.object<PendingTransfer>(pendingTransferCodec, v.transfer);
    }
  }
}

export const accumulateItemCodec = AccumulateItemCodec.create();
