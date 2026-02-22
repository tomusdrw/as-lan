import {BytesBlob} from "../core/bytes";
import {Optional} from "../core/result";
import { AccumulateItem, CodeHash, PackageInfo, ServiceId, Slot, WorkExecResultKind, WorkOutput, WorkPayload } from "../jam/types";

export function is_authorized(): u32 {
  return 0;
}

export function accumulate(
  _now: Slot,
  _id: ServiceId,
  results: StaticArray<AccumulateItem>,
): Optional<CodeHash> {
  for (let i = 0; i < results.length; i += 1) {
    const item = results[i];
    const exec = item.workExecResult;
    const okBlob = exec.okBlob;
    if (exec.kind === WorkExecResultKind.OK && okBlob !== null && okBlob.raw.length > 0) {
      return Optional.some<CodeHash>(item.workPackage);
    }
  }
  return Optional.none<CodeHash>();
}

export function refine(
  _id: ServiceId,
  payload: WorkPayload,
  _packageInfo: PackageInfo,
  extrinsics: StaticArray<BytesBlob>,
): WorkOutput {
  if (payload.raw.length > 0) {
    return payload;
  }

  for (let i = 0; i < extrinsics.length; i += 1) {
    if (extrinsics[i].raw.length > 0) {
      return extrinsics[i];
    }
  }

  return BytesBlob.parseBlob("0x").okay!;
}
