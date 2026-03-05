import { Assert, Test, test } from "../test";
import { BytesBlob } from "./bytes";
import { Decoder } from "./codec";

export const TESTS: Test[] = [
  test("decode judgemenet", () => {
    const data = BytesBlob.parseBlob(
      "0x01d204deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
    ).okay!;
    const decoder = Decoder.fromBlob(data.raw);

    // then
    const assert = new Assert();
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
    const assert = new Assert();
    assert.isEqual(decoder.isFinished(), false);
    assert.isEqualBytes(decoder.bytesVarLen(), BytesBlob.parseBlob("0x1234567890").okay!, "blob");
    assert.isEqual(decoder.isFinished(), true);
    assert.isEqual(decoder.isError, false);
    return assert;
  }),
];
