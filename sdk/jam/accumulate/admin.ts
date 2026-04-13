/**
 * High-level wrappers for privileged governance ecallis (14-16).
 *
 * Each privilege role can only update its own field via bless:
 * - The **manager** can change all fields (bless).
 * - The **delegator** can transfer the delegator role (blessDelegator).
 * - The **registrar** can transfer the registrar role (blessRegistrar).
 */

import { Bytes32, BytesBlob } from "../../core/bytes";
import { Encoder } from "../../core/codec/encode";
import { panic } from "../../core/panic";
import { ResultN } from "../../core/result";
import { EcalliResult } from "../../ecalli";
import { assign as assign_ } from "../../ecalli/accumulate/assign";
import { bless as bless_ } from "../../ecalli/accumulate/bless";
import { designate as designate_ } from "../../ecalli/accumulate/designate";
import {
  AUTO_ACCUMULATE_ENTRY_SIZE,
  AutoAccumulateEntry,
  CURRENT_SERVICE,
  CoreIndex,
  ServiceId,
  VALIDATOR_KEY_SIZE,
  ValidatorKey,
} from "../types";

export enum BlessError {
  /** Unknown service (WHO sentinel). */
  Who = 0,
  /** Invalid operation (HUH sentinel). */
  Huh = 1,
}

export enum AssignError {
  /** Unknown core (CORE sentinel). */
  Core = 0,
  /** Unknown service (WHO sentinel). */
  Who = 1,
  /** Invalid operation (HUH sentinel). */
  Huh = 2,
}

export enum DesignateError {
  /** Invalid operation (HUH sentinel). */
  Huh = 0,
}

export class Admin {
  static create(): Admin {
    return new Admin();
  }

  private constructor() {}

  /**
   * Full bless — only callable by the manager service.
   *
   * Sets all privileged configuration: manager, per-core assigners,
   * delegator, registrar, and auto-accumulate services.
   *
   * @param manager - new manager service ID
   * @param assigners - assigner service ID for each core (one per core, flat array)
   * @param delegator - new delegator service ID
   * @param registrar - new registrar service ID
   * @param autoAccumulate - auto-accumulate entries (service ID + gas pairs)
   */
  bless(
    manager: ServiceId,
    assigners: Array<ServiceId>,
    delegator: ServiceId,
    registrar: ServiceId,
    autoAccumulate: Array<AutoAccumulateEntry>,
  ): ResultN<bool, BlessError> {
    const assignersBlob = encodeServiceIds(assigners);
    const autoAccumBlob = encodeAutoAccumulate(autoAccumulate);
    const result = bless_(
      manager,
      assignersBlob.ptr(),
      delegator,
      registrar,
      autoAccumBlob.ptr(),
      autoAccumulate.length,
    );
    return mapBlessResult(result);
  }

  /**
   * Partial bless — callable by the current delegator to transfer the role.
   *
   * Only the delegator field is meaningful; the host ignores the rest.
   */
  blessDelegator(newDelegator: ServiceId): ResultN<bool, BlessError> {
    const empty = BytesBlob.empty();
    const result = bless_(0, empty.ptr(), newDelegator, 0, empty.ptr(), 0);
    return mapBlessResult(result);
  }

  /**
   * Partial bless — callable by the current registrar to transfer the role.
   *
   * Only the registrar field is meaningful; the host ignores the rest.
   */
  blessRegistrar(newRegistrar: ServiceId): ResultN<bool, BlessError> {
    const empty = BytesBlob.empty();
    const result = bless_(0, empty.ptr(), 0, newRegistrar, empty.ptr(), 0);
    return mapBlessResult(result);
  }

  /**
   * Assign an auth queue for a specific core (ecalli 15).
   *
   * Only callable by that core's assigner service (set via bless).
   *
   * @param core - core index
   * @param authQueue - auth queue entries (code hashes for that core)
   * @param newAssigner - transfer assigner permission (default: keep current service)
   */
  assign(
    core: CoreIndex,
    authQueue: Array<Bytes32>,
    newAssigner: ServiceId = CURRENT_SERVICE,
  ): ResultN<bool, AssignError> {
    const authQueueBlob = encodeBytes32Array(authQueue);
    const result = assign_(core, authQueueBlob.ptr(), newAssigner);
    if (result === EcalliResult.CORE) return ResultN.err<bool, AssignError>(AssignError.Core);
    if (result === EcalliResult.WHO) return ResultN.err<bool, AssignError>(AssignError.Who);
    if (result === EcalliResult.HUH) return ResultN.err<bool, AssignError>(AssignError.Huh);
    if (result >= 0) return ResultN.ok<bool, AssignError>(true);
    panic("Admin.assign: unexpected sentinel");
    return unreachable();
  }

  /**
   * Set the next epoch's validator keys (ecalli 16).
   *
   * @param validators - array of validator keys
   */
  designate(validators: Array<ValidatorKey>): ResultN<bool, DesignateError> {
    const blob = encodeValidators(validators);
    const result = designate_(blob.ptr());
    if (result === EcalliResult.HUH) return ResultN.err<bool, DesignateError>(DesignateError.Huh);
    if (result >= 0) return ResultN.ok<bool, DesignateError>(true);
    panic("Admin.designate: unexpected sentinel");
    return unreachable();
  }
}

function mapBlessResult(result: i64): ResultN<bool, BlessError> {
  if (result === EcalliResult.WHO) return ResultN.err<bool, BlessError>(BlessError.Who);
  if (result === EcalliResult.HUH) return ResultN.err<bool, BlessError>(BlessError.Huh);
  if (result >= 0) return ResultN.ok<bool, BlessError>(true);
  panic("Admin.bless: unexpected sentinel");
  return unreachable();
}

function encodeServiceIds(ids: Array<ServiceId>): BytesBlob {
  const enc = Encoder.create(ids.length * 4);
  for (let i = 0; i < ids.length; i++) {
    enc.u32(ids[i]);
  }
  return enc.finish();
}

function encodeAutoAccumulate(entries: Array<AutoAccumulateEntry>): BytesBlob {
  const enc = Encoder.create(entries.length * AUTO_ACCUMULATE_ENTRY_SIZE);
  for (let i = 0; i < entries.length; i++) {
    enc.u32(entries[i].serviceId);
    enc.u64(entries[i].gas);
  }
  return enc.finish();
}

function encodeBytes32Array(hashes: Array<Bytes32>): BytesBlob {
  const enc = Encoder.create(hashes.length * 32);
  for (let i = 0; i < hashes.length; i++) {
    enc.bytes32(hashes[i]);
  }
  return enc.finish();
}

function encodeValidators(validators: Array<ValidatorKey>): BytesBlob {
  const enc = Encoder.create(validators.length * VALIDATOR_KEY_SIZE);
  for (let i = 0; i < validators.length; i++) {
    const v = validators[i];
    enc.bytes32(v.ed25519);
    enc.bytes32(v.bandersnatch);
    enc.bytesFixLen(v.bls);
    enc.bytesFixLen(v.metadata);
  }
  return enc.finish();
}
