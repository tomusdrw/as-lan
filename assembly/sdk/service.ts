import {BytesBlob} from "../core/bytes";
import {Optional} from "../core/result";
import { CodeHash, CoreIndex, ServiceId, Slot, WorkOutput, WorkPackageHash } from "../jam/types";

export function is_authorized(): u32 {
  return 0;
}

export function accumulate(
  _slot: Slot,
  _serviceId: ServiceId,
  _argsLength: u32,
): Optional<CodeHash> {
  
  return Optional.none<CodeHash>();
}

export function refine(
  _core: CoreIndex,
  _itemIdx: u32,
  _serviceId: ServiceId,
  payload: BytesBlob,
  _hash: WorkPackageHash,
): WorkOutput {
  if (payload.raw.length > 0) {
    return payload;
  }

  return BytesBlob.empty();
}
