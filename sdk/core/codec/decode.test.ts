import { Assert, Test, test } from "../../test/utils";
import { BytesBlob } from "../bytes";
import { Decoder } from "./decode";
import { Encoder } from "./encode";

export const TESTS: Test[] = [
  test("varU32 normal value", () => {
    const e = Encoder.create();
    e.varU64(42);
    e.varU64(0xffff_ffff);

    const d = Decoder.fromBlob(e.finishRaw());
    const assert = Assert.create();
    assert.isEqual(d.varU32(), 42, "small");
    assert.isEqual(d.varU32(), 0xffff_ffff, "max u32");
    assert.isEqual(d.isFinished(), true, "finished");
    assert.isEqual(d.isError, false, "no error");
    return assert;
  }),

  test("varU32 overflow sets error", () => {
    const e = Encoder.create();
    e.varU64(0x1_0000_0000); // one above u32 max

    const d = Decoder.fromBlob(e.finishRaw());
    const assert = Assert.create();
    assert.isEqual(d.varU32(), 0, "returns 0");
    assert.isEqual(d.isError, true, "error set");
    return assert;
  }),

  test("varU32 missing bytes sets error", () => {
    const d = Decoder.fromBlob(BytesBlob.empty().raw);
    const assert = Assert.create();
    assert.isEqual(d.varU32(), 0, "returns 0");
    assert.isEqual(d.isError, true, "error set");
    return assert;
  }),

  test("decode judgemenet", () => {
    const data = BytesBlob.parseBlob(
      "0x01d204deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
    ).okay!;
    const decoder = Decoder.fromBlob(data.raw);

    // then
    const assert = Assert.create();
    assert.isEqual(decoder.u8(), 1, "isWorkReportValid");
    assert.isEqual(decoder.u16(), 1234, "index");
    assert.isEqualBytes(
      decoder.bytesFixLen(64),
      BytesBlob.parseBlob(
        "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
      ).okay!,
      "index",
    );
    assert.isEqual(decoder.isFinished(), true);
    assert.isEqual(decoder.isError, false);
    return assert;
  }),
  test("decode blob", () => {
    const data = BytesBlob.parseBlob("0x051234567890").okay!;
    const decoder = Decoder.fromBlob(data.raw);

    // then
    const assert = Assert.create();
    assert.isEqual(decoder.isFinished(), false);
    assert.isEqualBytes(decoder.bytesVarLen(), BytesBlob.parseBlob("0x1234567890").okay!, "blob");
    assert.isEqual(decoder.isFinished(), true);
    assert.isEqual(decoder.isError, false);
    return assert;
  }),
];
