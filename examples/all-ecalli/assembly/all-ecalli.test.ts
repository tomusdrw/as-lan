import {
  AccumulateArgs,
  AccumulateContext,
  Bytes32,
  BytesBlob,
  Decoder,
  Encoder,
  RefineArgs,
  RefineContext,
  Response,
} from "@fluffylabs/as-lan";
import { Assert, Test, test, unpackResult } from "@fluffylabs/as-lan/test";
import { accumulate } from "./accumulate";
import { refine } from "./refine";

/** Expected number of ecalli calls by refine (general 0-5,100 + fetch kinds 0-13 + refine 6-13). */
const REFINE_ECALLI_COUNT: u32 = 28;
/** Expected number of ecalli calls by accumulate (general 0-5,100 + fetch kinds 0,1,14,15 + accumulate 14-26). */
const ACCUMULATE_ECALLI_COUNT: u32 = 23;

function callRefine(): Response {
  const ctx = RefineContext.create();
  const args = RefineArgs.create(0, 0, 42, BytesBlob.empty(), Bytes32.zero());
  const enc = Encoder.create();
  ctx.refineArgs.encode(args, enc);
  const blob = enc.finish();
  const raw = unpackResult(refine(blob.ptr(), blob.length));
  return ctx.response.decode(Decoder.fromBlob(raw)).okay!;
}

function callAccumulate(): Response {
  const ctx = AccumulateContext.create();
  const args = AccumulateArgs.create(7, 42, 0);
  const enc = Encoder.create();
  ctx.accumulateArgs.encode(args, enc);
  const blob = enc.finish();
  const raw = unpackResult(accumulate(blob.ptr(), blob.length));
  return ctx.response.decode(Decoder.fromBlob(raw)).okay!;
}

export const TESTS: Test[] = [
  test("refine: invokes all general + refine ecallis", () => {
    const resp = callRefine();
    const assert = Assert.create();
    assert.isEqual(resp.result, i64(REFINE_ECALLI_COUNT), "refine ecalli count");

    // Decode the count from the data
    const d = Decoder.fromBlob(resp.data.raw);
    const count = d.varU32();
    assert.isEqual(count, REFINE_ECALLI_COUNT, "encoded count matches");

    // Verify we can decode all result pairs (ecalli_index + u64 result)
    for (let i: u32 = 0; i < count; i++) {
      const idx = d.varU64();
      const _result = d.u64();
      if (d.isError) {
        assert.fail(`failed to decode result pair at index ${i} (ecalli ${idx})`);
        break;
      }
    }
    return assert;
  }),

  test("accumulate: invokes all general + accumulate ecallis", () => {
    const resp = callAccumulate();
    const assert = Assert.create();
    assert.isEqual(resp.result, i64(ACCUMULATE_ECALLI_COUNT), "accumulate ecalli count");

    // Decode the count from the data
    const d = Decoder.fromBlob(resp.data.raw);
    const count = d.varU32();
    assert.isEqual(count, ACCUMULATE_ECALLI_COUNT, "encoded count matches");

    // Verify we can decode all result pairs (ecalli_index + u64 result)
    for (let i: u32 = 0; i < count; i++) {
      const idx = d.varU64();
      const _result = d.u64();
      if (d.isError) {
        assert.fail(`failed to decode result pair at index ${i} (ecalli ${idx})`);
        break;
      }
    }
    return assert;
  }),
];
