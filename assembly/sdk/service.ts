import {BytesBlob} from "../core/bytes";
import {Optional} from "../core/result";
import { AccumulateItem, CodeHash, PackageInfo, ServiceId, Slot, WorkOutput, WorkPayload } from "../jam/types";
import {gas} from "./imports";

export function is_authorized(): u32 {
  return 0;
}

export function accumulate(
  _now: Slot,
  _id: ServiceId,
  _results: StaticArray<AccumulateItem>,
): Optional<CodeHash> {
  return Optional.none<CodeHash>();
}

export function refine(
  _id: ServiceId,
  _payload: WorkPayload,
  _packageInfo: PackageInfo,
  _extrinsics: StaticArray<BytesBlob>,
): WorkOutput {
  const limit = gas();
  let a = 1;
  let b = 1;

  for (let i = 1; i < limit; i += 1) {
    const t = b;
    b = a;
    a = a + t;
  }

  return BytesBlob.parseBlob("0x").okay!;
}
