/**
 * Types for accumulate-context items: operands (work results) and transfers.
 *
 * During accumulation, services call `fetch(kind=15, index)` to retrieve items.
 * Each item is a tagged union: tag=0 for operand, tag=1 for transfer.
 *
 * @see https://graypaper.fluffylabs.dev
 */

import { Bytes32, BytesBlob } from "../../core/bytes";
import { Decoder } from "../../core/codec/decode";
import { Encoder } from "../../core/codec/encode";

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

  /** Decode from a Decoder (varint tag + optional blob). */
  static decode(d: Decoder): WorkExecResult {
    const kind = d.varU32();
    if (kind === WorkExecResultKind.Ok) {
      const blob = d.bytesVarLen();
      return WorkExecResult.create(kind, blob);
    }
    if (kind > u32(WorkExecResultKind.CodeOversize)) {
      d.setError();
    }
    return WorkExecResult.create(kind, BytesBlob.empty());
  }

  /** Encode into an Encoder (varint tag + optional blob). */
  encode(e: Encoder): void {
    e.varU64(u64(this.kind));
    if (this.kind === WorkExecResultKind.Ok) {
      e.bytesVarLen(this.okBlob);
    }
  }

  get isOk(): bool {
    return this.kind === WorkExecResultKind.Ok;
  }
}

/**
 * Operand: a work result from the refine phase.
 *
 * Encoding order matches the Gray Paper / typeberry codec:
 *   hash(32) + exportsRoot(32) + authorizerHash(32) + payloadHash(32)
 *   + gas(varU64) + result(WorkExecResult) + authorizationOutput(blob)
 */
export class Operand {
  static create(
    hash: Bytes32,
    exportsRoot: Bytes32,
    authorizerHash: Bytes32,
    payloadHash: Bytes32,
    gas: u64,
    result: WorkExecResult,
    authorizationOutput: BytesBlob,
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

  static decode(d: Decoder): Operand {
    const hash = d.bytes32();
    const exportsRoot = d.bytes32();
    const authorizerHash = d.bytes32();
    const payloadHash = d.bytes32();
    const gas = d.varU64();
    const result = WorkExecResult.decode(d);
    const authorizationOutput = d.bytesVarLen();
    return Operand.create(hash, exportsRoot, authorizerHash, payloadHash, gas, result, authorizationOutput);
  }

  /** Encode operand fields into an Encoder. */
  encode(e: Encoder): void {
    e.bytesFixLen(this.hash.raw);
    e.bytesFixLen(this.exportsRoot.raw);
    e.bytesFixLen(this.authorizerHash.raw);
    e.bytesFixLen(this.payloadHash.raw);
    e.varU64(this.gas);
    this.result.encode(e);
    e.bytesVarLen(this.authorizationOutput);
  }

  /** Encode as a tagged accumulate item (tag + operand fields). */
  encodeTagged(e: Encoder): void {
    e.varU64(AccumulateItemKind.Operand);
    this.encode(e);
  }
}

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

  static decode(d: Decoder): PendingTransfer {
    const source = d.u32();
    const destination = d.u32();
    const amount = d.u64();
    const memo = d.bytesFixLen(TRANSFER_MEMO_SIZE);
    const gas = d.u64();
    return PendingTransfer.create(source, destination, amount, memo, gas);
  }

  /** Encode transfer fields into an Encoder. */
  encode(e: Encoder): void {
    e.u32(this.source);
    e.u32(this.destination);
    e.u64(this.amount);
    // Memo must be at most TRANSFER_MEMO_SIZE bytes; pad if shorter.
    const raw = this.memo.raw;
    assert(<u32>raw.length <= TRANSFER_MEMO_SIZE, `memo too large: ${raw.length} > ${TRANSFER_MEMO_SIZE}`);
    if (<u32>raw.length === TRANSFER_MEMO_SIZE) {
      e.bytesFixLen(raw);
    } else {
      const padded = new Uint8Array(TRANSFER_MEMO_SIZE);
      padded.set(raw);
      e.bytesFixLen(padded);
    }
    e.u64(this.gas);
  }

  /** Encode as a tagged accumulate item (tag + transfer fields). */
  encodeTagged(e: Encoder): void {
    e.varU64(AccumulateItemKind.Transfer);
    this.encode(e);
  }
}

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

  /** Decode a tagged accumulate item (varint tag + body). */
  static decode(d: Decoder): AccumulateItem {
    const tag = d.varU32();
    if (d.isError) {
      return new AccumulateItem(AccumulateItemKind.Operand, null, null);
    }
    if (tag === AccumulateItemKind.Operand) {
      return AccumulateItem.fromOperand(Operand.decode(d));
    }
    if (tag === AccumulateItemKind.Transfer) {
      return AccumulateItem.fromTransfer(PendingTransfer.decode(d));
    }
    // Unknown tag — signal via decoder error.
    d.setError();
    return new AccumulateItem(tag, null, null);
  }

  /** Encode as a tagged accumulate item. */
  encode(e: Encoder): void {
    if (this.isOperand) {
      this._operand!.encodeTagged(e);
    } else {
      this._transfer!.encodeTagged(e);
    }
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
