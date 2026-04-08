/**
 * Accumulate-context preimage management (ecalli 2, 22-24, 26).
 *
 * Composes {@link Preimages} for standard lookups and adds accumulate-only
 * operations: query, solicit, forget, provide.
 */

import { Bytes32, BytesBlob } from "../../core/bytes";
import { panic } from "../../core/panic";
import { Optional, ResultN } from "../../core/result";
import { EcalliResult } from "../../ecalli";
import { forget } from "../../ecalli/accumulate/forget";
import { provide } from "../../ecalli/accumulate/provide";
import { query } from "../../ecalli/accumulate/query";
import { solicit } from "../../ecalli/accumulate/solicit";
import { PreimageStatus, Preimages } from "../preimages";
import { CURRENT_SERVICE } from "../types";

export enum SolicitError {
  /** Invalid operation (HUH sentinel). */
  Huh = 0,
  /** Storage full (FULL sentinel). */
  Full = 1,
}

export enum ForgetError {
  /** Invalid operation (HUH sentinel). */
  Huh = 0,
}

export enum ProvideError {
  /** Unknown service (WHO sentinel). */
  Who = 0,
  /** Invalid operation (HUH sentinel). */
  Huh = 1,
}

export class AccumulatePreimages {
  static create(bufSize: u32 = 1024): AccumulatePreimages {
    return new AccumulatePreimages(bufSize);
  }

  private readonly preimages: Preimages;
  private readonly r8Buf: Uint8Array;

  private constructor(bufSize: u32) {
    this.preimages = Preimages.create(bufSize);
    this.r8Buf = new Uint8Array(8);
  }

  /**
   * Look up a preimage by its blake2b hash.
   *
   * @param hash - 32-byte blake2b hash of the preimage
   * @param serviceId - service to query (default: current service)
   * @returns the preimage data, or none if not found
   */
  lookup(hash: Bytes32, serviceId: u32 = CURRENT_SERVICE): Optional<BytesBlob> {
    return this.preimages.lookup(hash, serviceId);
  }

  /**
   * Query the status of a preimage solicitation.
   *
   * @param hash - 32-byte blake2b hash of the preimage
   * @param length - expected preimage length
   * @returns the preimage status, or none if not solicited
   */
  query(hash: Bytes32, length: u32): Optional<PreimageStatus> {
    const r7 = query(hash.ptr(), length, u32(this.r8Buf.dataStart));
    if (r7 === EcalliResult.NONE) return Optional.none<PreimageStatus>();

    const r8 = loadR8(this.r8Buf);
    return Optional.some<PreimageStatus>(decodeStatus(r7, r8));
  }

  /**
   * Request that a preimage be made available.
   *
   * @param hash - 32-byte blake2b hash of the preimage
   * @param length - expected preimage length
   * @returns ok(true) on success, or SolicitError
   */
  solicit(hash: Bytes32, length: u32): ResultN<bool, SolicitError> {
    const result = solicit(hash.ptr(), length);
    if (result === EcalliResult.HUH) return ResultN.err<bool, SolicitError>(SolicitError.Huh);
    if (result === EcalliResult.FULL) return ResultN.err<bool, SolicitError>(SolicitError.Full);
    if (result >= 0) return ResultN.ok<bool, SolicitError>(true);
    panic("AccumulatePreimages.solicit: unexpected sentinel");
    return unreachable();
  }

  /**
   * Cancel a previous preimage solicitation.
   *
   * @param hash - 32-byte blake2b hash of the preimage
   * @param length - expected preimage length
   * @returns ok(true) on success, or ForgetError
   */
  forget(hash: Bytes32, length: u32): ResultN<bool, ForgetError> {
    const result = forget(hash.ptr(), length);
    if (result === EcalliResult.HUH) return ResultN.err<bool, ForgetError>(ForgetError.Huh);
    if (result >= 0) return ResultN.ok<bool, ForgetError>(true);
    panic("AccumulatePreimages.forget: unexpected sentinel");
    return unreachable();
  }

  /**
   * Supply a preimage for a previously solicited hash.
   *
   * @param preimage - the full preimage data
   * @param serviceId - target service (default: current service)
   * @returns ok(true) on success, or ProvideError
   */
  provide(preimage: BytesBlob, serviceId: u32 = CURRENT_SERVICE): ResultN<bool, ProvideError> {
    const result = provide(serviceId, u32(preimage.raw.dataStart), preimage.raw.length);
    if (result === EcalliResult.WHO) return ResultN.err<bool, ProvideError>(ProvideError.Who);
    if (result === EcalliResult.HUH) return ResultN.err<bool, ProvideError>(ProvideError.Huh);
    if (result >= 0) return ResultN.ok<bool, ProvideError>(true);
    panic("AccumulatePreimages.provide: unexpected sentinel");
    return unreachable();
  }
}

/** Read the i64 value written by the query ecalli into the r8 buffer. */
function loadR8(buf: Uint8Array): i64 {
  return load<i64>(buf.dataStart);
}

/**
 * Decode the query ecalli output registers into a PreimageStatus.
 *
 * Encoding (GP Appendix B, Ω_Q / ecalli 22):
 * - r7 low 32 bits  = kind (0=Requested, 1=Available, 2=Unavailable, 3=Reavailable)
 * - r7 upper 32 bits = slot0
 * - r8 low 32 bits  = slot1 (Unavailable, Reavailable)
 * - r8 upper 32 bits = slot2 (Reavailable)
 */
function decodeStatus(r7: i64, r8: i64): PreimageStatus {
  const kind = u32(r7 & 0xff);
  const slot0 = u32(r7 >> 32);
  if (kind === 0) return PreimageStatus.requested();
  if (kind === 1) return PreimageStatus.available(slot0);
  const slot1 = u32(r8 & 0xffffffff);
  if (kind === 2) return PreimageStatus.unavailable(slot0, slot1);
  const slot2 = u32(r8 >> 32);
  return PreimageStatus.reavailable(slot0, slot1, slot2);
}
