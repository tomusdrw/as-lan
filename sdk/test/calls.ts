/**
 * Builders for invoking a service's `refine` / `accumulate` entrypoints from
 * AS tests, plus builders for the encoded `AccumulateItem` blobs the host
 * delivers via `TestAccumulate.setItem`.
 *
 * Use the chained `with*` setters to override defaults, then `.call(fn, ...)`
 * or `.build()`:
 *
 * ```typescript
 * const resp = RefineCall.create().withServiceId(10).call(refine, payload);
 * const result = AccumulateCall.create().withSlot(7).withServiceId(9).call(accumulate, 0);
 *
 * TestAccumulate.setItem(0, OperandItem.create().withOkBlob(payload).build());
 * TestAccumulate.setItem(1, TransferItem.create().withSource(1).withDest(2).withAmount(100).build());
 * ```
 */

import { Bytes32, BytesBlob } from "../core/bytes";
import { Decoder } from "../core/codec/decode";
import { Encoder } from "../core/codec/encode";
import {
  AccumulateItem,
  AccumulateItemCodec,
  Operand,
  OperandCodec,
  PendingTransfer,
  PendingTransferCodec,
  WorkExecResult,
  WorkExecResultCodec,
  WorkExecResultKind,
} from "../jam/accumulate/item";
import {
  AccumulateArgs,
  AccumulateArgsCodec,
  RefineArgs,
  RefineArgsCodec,
  Response,
  ResponseCodec,
} from "../jam/service";
import { CoreIndex, ServiceId, Slot, WorkPackageHash } from "../jam/types";
import { unpackResult } from "./utils";

/**
 * Build the AccumulateItemCodec used by the operand/transfer builders.
 * Kept private to this module — callers don't need to know about codec wiring.
 */
function accumulateItemCodec(): AccumulateItemCodec {
  return AccumulateItemCodec.create(OperandCodec.create(WorkExecResultCodec.create()), PendingTransferCodec.create());
}

const DEFAULT_SERVICE_ID: ServiceId = 42;
const DEFAULT_SLOT: Slot = 7;

/**
 * Builder for invoking a service's `refine` entrypoint.
 *
 * Defaults: coreIndex=0, itemIndex=0, serviceId=42, workPackageHash=zeros.
 */
export class RefineCall {
  static create(): RefineCall {
    return new RefineCall();
  }

  private _coreIndex: CoreIndex = 0;
  private _itemIndex: u32 = 0;
  private _serviceId: ServiceId = DEFAULT_SERVICE_ID;
  private _workPackageHash: WorkPackageHash = Bytes32.zero();

  private constructor() {}

  withCoreIndex(v: CoreIndex): RefineCall {
    this._coreIndex = v;
    return this;
  }

  withItemIndex(v: u32): RefineCall {
    this._itemIndex = v;
    return this;
  }

  withServiceId(v: ServiceId): RefineCall {
    this._serviceId = v;
    return this;
  }

  withWorkPackageHash(h: WorkPackageHash): RefineCall {
    this._workPackageHash = h;
    return this;
  }

  /**
   * Encode RefineArgs around `payload`, invoke `refineFn`, and return the
   * decoded `Response`. Panics if the response cannot be decoded.
   */
  call(refineFn: (ptr: u32, len: u32) => u64, payload: BytesBlob): Response {
    const args = RefineArgs.create(this._coreIndex, this._itemIndex, this._serviceId, payload, this._workPackageHash);
    const enc = Encoder.create();
    RefineArgsCodec.create().encode(args, enc);
    const buf = enc.finish();
    const raw = unpackResult(refineFn(buf.ptr(), buf.length));
    const r = ResponseCodec.create().decode(Decoder.fromBytesBlob(BytesBlob.wrap(raw)));
    assert(!r.isError, "RefineCall.call: response decode failed");
    return r.okay!;
  }
}

/**
 * Builder for invoking a service's `accumulate` entrypoint.
 *
 * Defaults: slot=7, serviceId=42.
 *
 * The caller is responsible for seeding any items (operands / transfers)
 * via `TestAccumulate.setItem(i, ...)` before calling `.call()`. The
 * `argsLength` argument to `.call()` must match the number of seeded items.
 */
export class AccumulateCall {
  static create(): AccumulateCall {
    return new AccumulateCall();
  }

  private _slot: Slot = DEFAULT_SLOT;
  private _serviceId: ServiceId = DEFAULT_SERVICE_ID;

  private constructor() {}

  withSlot(v: Slot): AccumulateCall {
    this._slot = v;
    return this;
  }

  withServiceId(v: ServiceId): AccumulateCall {
    this._serviceId = v;
    return this;
  }

  /**
   * Encode AccumulateArgs (with the given `argsLength`), invoke
   * `accumulateFn`, and return the raw response bytes.
   */
  call(accumulateFn: (ptr: u32, len: u32) => u64, argsLength: u32): BytesBlob {
    const args = AccumulateArgs.create(this._slot, this._serviceId, argsLength);
    const enc = Encoder.create();
    AccumulateArgsCodec.create().encode(args, enc);
    const buf = enc.finish();
    return BytesBlob.wrap(unpackResult(accumulateFn(buf.ptr(), buf.length)));
  }
}

const DEFAULT_OPERAND_GAS: u64 = 100000;

/**
 * Builder for an encoded `AccumulateItem::Operand` blob, suitable for
 * `TestAccumulate.setItem(i, ...)`.
 *
 * Defaults: all four 32-byte hashes zeros, gas=100000, result=Ok with empty
 * okBlob, authorizationOutput=empty.
 */
export class OperandItem {
  static create(): OperandItem {
    return new OperandItem();
  }

  private _hash: Bytes32 = Bytes32.zero();
  private _exportsRoot: Bytes32 = Bytes32.zero();
  private _authorizerHash: Bytes32 = Bytes32.zero();
  private _payloadHash: Bytes32 = Bytes32.zero();
  private _gas: u64 = DEFAULT_OPERAND_GAS;
  private _resultKind: WorkExecResultKind = WorkExecResultKind.Ok;
  private _okBlob: BytesBlob = BytesBlob.empty();
  private _authorizationOutput: BytesBlob = BytesBlob.empty();

  private constructor() {}

  withHash(h: Bytes32): OperandItem {
    this._hash = h;
    return this;
  }

  withExportsRoot(h: Bytes32): OperandItem {
    this._exportsRoot = h;
    return this;
  }

  withAuthorizerHash(h: Bytes32): OperandItem {
    this._authorizerHash = h;
    return this;
  }

  withPayloadHash(h: Bytes32): OperandItem {
    this._payloadHash = h;
    return this;
  }

  withGas(v: u64): OperandItem {
    this._gas = v;
    return this;
  }

  /** Set the operand result to `Ok(blob)`. */
  withOkBlob(blob: BytesBlob): OperandItem {
    this._resultKind = WorkExecResultKind.Ok;
    this._okBlob = blob;
    return this;
  }

  /** Set the operand result kind (e.g. Panic, OutOfGas). Clears any okBlob. */
  withResultKind(kind: WorkExecResultKind): OperandItem {
    this._resultKind = kind;
    if (kind !== WorkExecResultKind.Ok) this._okBlob = BytesBlob.empty();
    return this;
  }

  withAuthorizationOutput(blob: BytesBlob): OperandItem {
    this._authorizationOutput = blob;
    return this;
  }

  /** Encode the operand as an AccumulateItem blob (tag=0 + Operand). */
  build(): BytesBlob {
    const op = Operand.create(
      this._hash,
      this._exportsRoot,
      this._authorizerHash,
      this._payloadHash,
      this._gas,
      WorkExecResult.create(this._resultKind, this._okBlob),
      this._authorizationOutput,
    );
    const enc = Encoder.create();
    accumulateItemCodec().encode(AccumulateItem.fromOperand(op), enc);
    return enc.finish();
  }
}

const DEFAULT_TRANSFER_GAS: u64 = 10000;

/**
 * Builder for an encoded `AccumulateItem::PendingTransfer` blob, suitable for
 * `TestAccumulate.setItem(i, ...)`.
 *
 * Defaults: source=0, destination=0, amount=0, memo=empty (auto-padded to 128
 * bytes by the codec), gas=10000.
 */
export class TransferItem {
  static create(): TransferItem {
    return new TransferItem();
  }

  private _source: u32 = 0;
  private _destination: u32 = 0;
  private _amount: u64 = 0;
  private _memo: BytesBlob = BytesBlob.empty();
  private _gas: u64 = DEFAULT_TRANSFER_GAS;

  private constructor() {}

  withSource(v: u32): TransferItem {
    this._source = v;
    return this;
  }

  withDest(v: u32): TransferItem {
    this._destination = v;
    return this;
  }

  withAmount(v: u64): TransferItem {
    this._amount = v;
    return this;
  }

  withMemo(blob: BytesBlob): TransferItem {
    this._memo = blob;
    return this;
  }

  withGas(v: u64): TransferItem {
    this._gas = v;
    return this;
  }

  /** Encode the transfer as an AccumulateItem blob (tag=1 + PendingTransfer). */
  build(): BytesBlob {
    const tx = PendingTransfer.create(this._source, this._destination, this._amount, this._memo, this._gas);
    const enc = Encoder.create();
    accumulateItemCodec().encode(AccumulateItem.fromTransfer(tx), enc);
    return enc.finish();
  }
}
