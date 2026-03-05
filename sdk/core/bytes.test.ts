import { Assert, Test, test } from "../test";
import { BlobParseError, BytesBlob } from "./bytes";

export const TESTS: Test[] = [
  test("bytes.toString", () => {
    // given
    const data = new Uint8Array(4);
    data[0] = 0xde;
    data[1] = 0xad;
    data[2] = 0xbe;
    data[3] = 0xef;

    // when
    const blob = new BytesBlob(data);

    // then
    const assert = new Assert();
    assert.isEqual(blob.toString(), "0xdeadbeef");
    return assert;
  }),
  test("bytes.fromString", () => {
    // when
    const res = BytesBlob.parseBlobNoPrefix("deadbeef");

    const assert = new Assert();
    assert.isEqual(res.isOkay, true, "expected ok");
    const okay = res.okay;
    if (okay !== null) {
      assert.isEqual(okay.toString(), "0xdeadbeef");
    }
    return assert;
  }),
  test("bytes.fromString!len", () => {
    // when
    const res = BytesBlob.parseBlobNoPrefix("1");

    const assert = new Assert();
    assert.isEqual(res.isError, true, "expected error");
    assert.isEqual(res.error, BlobParseError.InvalidNumberOfNibbles, "expected error");
    return assert;
  }),
  test("bytes.fromString!chars", () => {
    // when
    const res = BytesBlob.parseBlobNoPrefix("1234567890abcdefgh");

    const assert = new Assert();
    assert.isEqual(res.isError, true, "should be error");
    assert.isEqual(res.error, BlobParseError.InvalidCharacters, "expected error");
    return assert;
  }),
];
