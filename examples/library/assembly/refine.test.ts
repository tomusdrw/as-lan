import { Bytes32, BytesBlob, Decoder, Encoder, InvokeIo, Machine } from "@fluffylabs/as-lan";
import { Assert, Test, TestMachine, test } from "@fluffylabs/as-lan/test";
import { LibraryEntry, LibraryEntryCodec, libraryKey } from "./storage";

export const TESTS: Test[] = [
  test("mock: setInvokeIoR7 writes r7 into InvokeIo after invoke", () => {
    const assert = Assert.create();
    TestMachine.setInvokeResult(0, 0); // Halt, r8 = 0
    TestMachine.setInvokeIoR7(0x0000000500000100); // len=5 in high, ptr=0x100 in low

    const r = Machine.create(BytesBlob.zero(4), 0);
    if (r.isError) {
      assert.fail("machine create failed");
      return assert;
    }
    const m = r.okay;
    const io = InvokeIo.create(1000);
    m.invoke(io);
    assert.isEqual(io.getRegister(7), 0x0000000500000100, "r7 written");
    return assert;
  }),

  test("storage: LibraryEntry encode/decode round-trip", () => {
    const assert = Assert.create();
    const hash = Bytes32.zero();
    hash.raw[0] = 0x42;
    const entry = LibraryEntry.create(hash, 1024);
    const codec = LibraryEntryCodec.create();

    const enc = Encoder.create();
    codec.encode(entry, enc);
    const bytes = enc.finishRaw();
    assert.isEqual(bytes.length, 36, "encoded length");

    const decoded = codec.decode(Decoder.fromBlob(bytes)).okay!;
    assert.isEqual(decoded.hash.raw[0], 0x42, "hash byte 0");
    assert.isEqual(decoded.length, 1024, "length");
    return assert;
  }),

  test("storage: libraryKey prepends 'lib:'", () => {
    const assert = Assert.create();
    const key = libraryKey("ed25519");
    const expected = BytesBlob.encodeAscii("lib:ed25519");
    assert.isEqualBytes(BytesBlob.wrap(key), expected, "key");
    return assert;
  }),

  test("mock: setPeekData writes configured bytes to dest", () => {
    const assert = Assert.create();
    const payload = BytesBlob.parseBlob("0xdeadbeef").okay!;
    TestMachine.setPeekData(payload.raw);

    const r = Machine.create(BytesBlob.zero(4), 0);
    if (r.isError) {
      assert.fail("machine create failed");
      return assert;
    }
    const m = r.okay;
    const buf = BytesBlob.zero(4);
    m.peek(0, buf);
    assert.isEqualBytes(buf, payload, "peek data");
    return assert;
  }),
];
