/**
 * High-level wrappers for service storage and info ecallis.
 *
 * - {@link ServiceData} — read-only access to any service (info, read).
 * - {@link CurrentServiceData} — adds write access for the current service.
 */

import { Decoder } from "../core/codec/decode";
import { panic } from "../core/panic";
import { Optional, OptionalN, Result } from "../core/result";
import { EcalliResult } from "../ecalli";
import { info } from "../ecalli/general/info";
import { read } from "../ecalli/general/read";
import { write } from "../ecalli/general/write";
import { ACCOUNT_INFO_SIZE, AccountInfo, AccountInfoCodec } from "./account-info";

export enum WriteError {
  /** Storage quota exceeded (FULL sentinel). */
  Full = 0,
}

export class ServiceData {
  static create(serviceId: u32, bufSize: u32 = 1024): ServiceData {
    return new ServiceData(serviceId, bufSize);
  }

  protected buf: Uint8Array;

  private _accountInfoCodec: AccountInfoCodec | null = null;

  protected constructor(
    protected readonly serviceId: u32,
    bufSize: u32,
  ) {
    this.buf = new Uint8Array(bufSize);
  }

  private get accountInfoCodec(): AccountInfoCodec {
    if (this._accountInfoCodec === null) this._accountInfoCodec = AccountInfoCodec.create();
    return this._accountInfoCodec!;
  }

  /** Get account info for this service. Returns None if the service does not exist. */
  info(): Optional<AccountInfo> {
    // Ensure buffer is large enough for the 96-byte info structure.
    if (u32(this.buf.length) < ACCOUNT_INFO_SIZE) {
      this.buf = new Uint8Array(ACCOUNT_INFO_SIZE);
    }
    const result = info(this.serviceId, u32(this.buf.dataStart), 0, ACCOUNT_INFO_SIZE);
    if (result === EcalliResult.NONE) return Optional.none<AccountInfo>();

    const d = Decoder.fromBlob(this.buf.subarray(0, ACCOUNT_INFO_SIZE));
    const r = this.accountInfoCodec.decode(d);
    if (r.isError || !d.isFinished()) panic("ServiceData.info: host returned malformed data");
    return Optional.some<AccountInfo>(r.okay!);
  }

  /** Read a value from storage by key. Returns None if the key does not exist. */
  read(key: Uint8Array): Optional<Uint8Array> {
    let result = read(this.serviceId, u32(key.dataStart), key.length, u32(this.buf.dataStart), 0, this.buf.length);
    if (result === EcalliResult.NONE) return Optional.none<Uint8Array>();

    // Auto-expand: the host told us the total length exceeds our buffer.
    if (result > i64(this.buf.length)) {
      this.buf = new Uint8Array(u32(result));
      result = read(this.serviceId, u32(key.dataStart), key.length, u32(this.buf.dataStart), 0, this.buf.length);
      if (result === EcalliResult.NONE) return Optional.none<Uint8Array>();
    }

    const len = u32(min(i64(this.buf.length), result));
    return Optional.some<Uint8Array>(this.buf.slice(0, len));
  }
}

export class CurrentServiceData extends ServiceData {
  static create(bufSize: u32 = 1024): CurrentServiceData {
    return new CurrentServiceData(bufSize);
  }

  private constructor(bufSize: u32) {
    super(u32.MAX_VALUE, bufSize);
  }

  /**
   * Write a value to storage.
   *
   * Returns the previous value's length wrapped in Optional (None if no prior value existed).
   * Fails with WriteError.Full if the storage quota is exceeded.
   * Pass an empty value (length 0) to delete the entry.
   */
  write(key: Uint8Array, value: Uint8Array): Result<OptionalN<u64>, WriteError> {
    const result = write(u32(key.dataStart), key.length, u32(value.dataStart), value.length);
    if (result === EcalliResult.FULL) return Result.err<OptionalN<u64>, WriteError>(WriteError.Full);
    if (result === EcalliResult.NONE) return Result.ok<OptionalN<u64>, WriteError>(OptionalN.none<u64>());
    return Result.ok<OptionalN<u64>, WriteError>(OptionalN.some<u64>(u64(result)));
  }
}
