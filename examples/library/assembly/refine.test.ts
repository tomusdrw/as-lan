import { Bytes32, BytesBlob, Decoder, Encoder, InvokeIo, Machine } from "@fluffylabs/as-lan";
import { Assert, Test, TestHistoricalLookup, TestMachine, TestStorage, test } from "@fluffylabs/as-lan/test";
import { AdminCommand, AdminCommandCodec, AdminCommandKind } from "./admin";
import { LibraryEntry, LibraryEntryCodec, libraryKey } from "./storage";
import { callRefine } from "./test-helpers";

function buildDemoInput(name: string, entrypoint: u32, gas: u64, payload: BytesBlob): Uint8Array {
  const enc = Encoder.create();
  enc.u8(0); // demo tag
  enc.bytesVarLen(BytesBlob.encodeAscii(name));
  enc.u32(entrypoint);
  enc.u64(gas);
  enc.bytesVarLen(payload);
  return enc.finishRaw();
}

function seedLibraryMapping(name: string, hashByte0: u8, length: u32): void {
  const h = Bytes32.zero();
  h.raw[0] = hashByte0;
  const e = LibraryEntry.create(h, length);
  const enc = Encoder.create();
  LibraryEntryCodec.create().encode(e, enc);
  TestStorage.set(BytesBlob.wrap(libraryKey(name)), BytesBlob.wrap(enc.finishRaw()));
}

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

  test("admin: SetMapping round-trip", () => {
    const assert = Assert.create();
    const hash = Bytes32.zero();
    hash.raw[0] = 0xaa;
    const cmd = AdminCommand.setMapping(BytesBlob.encodeAscii("ed25519"), hash, 4096);
    const codec = AdminCommandCodec.create();

    const enc = Encoder.create();
    codec.encode(cmd, enc);
    const decoded = codec.decode(Decoder.fromBlob(enc.finishRaw())).okay!;
    assert.isEqual<u32>(decoded.kind, AdminCommandKind.SetMapping, "kind");
    assert.isEqualBytes(decoded.name!, BytesBlob.encodeAscii("ed25519"), "name");
    assert.isEqual(decoded.hash!.raw[0], 0xaa, "hash");
    assert.isEqual(decoded.length, 4096, "length");
    return assert;
  }),

  test("admin: RemoveMapping round-trip", () => {
    const assert = Assert.create();
    const cmd = AdminCommand.removeMapping(BytesBlob.encodeAscii("blake2b"));
    const codec = AdminCommandCodec.create();

    const enc = Encoder.create();
    codec.encode(cmd, enc);
    const decoded = codec.decode(Decoder.fromBlob(enc.finishRaw())).okay!;
    assert.isEqual<u32>(decoded.kind, AdminCommandKind.RemoveMapping, "kind");
    assert.isEqualBytes(decoded.name!, BytesBlob.encodeAscii("blake2b"), "name");
    return assert;
  }),

  test("admin: Solicit round-trip", () => {
    const assert = Assert.create();
    const hash = Bytes32.zero();
    hash.raw[0] = 0xbb;
    const cmd = AdminCommand.solicit(hash, 2048);
    const codec = AdminCommandCodec.create();

    const enc = Encoder.create();
    codec.encode(cmd, enc);
    const decoded = codec.decode(Decoder.fromBlob(enc.finishRaw())).okay!;
    assert.isEqual<u32>(decoded.kind, AdminCommandKind.Solicit, "kind");
    assert.isEqual(decoded.hash!.raw[0], 0xbb, "hash");
    assert.isEqual(decoded.length, 2048, "length");
    return assert;
  }),

  test("admin: Forget round-trip", () => {
    const assert = Assert.create();
    const hash = Bytes32.zero();
    hash.raw[0] = 0xcc;
    const cmd = AdminCommand.forget(hash, 512);
    const codec = AdminCommandCodec.create();

    const enc = Encoder.create();
    codec.encode(cmd, enc);
    const decoded = codec.decode(Decoder.fromBlob(enc.finishRaw())).okay!;
    assert.isEqual<u32>(decoded.kind, AdminCommandKind.Forget, "kind");
    assert.isEqual(decoded.hash!.raw[0], 0xcc, "hash");
    assert.isEqual(decoded.length, 512, "length");
    return assert;
  }),

  test("admin: Provide round-trip", () => {
    const assert = Assert.create();
    const preimage = BytesBlob.parseBlob("0x01020304").okay!;
    const cmd = AdminCommand.provide(preimage);
    const codec = AdminCommandCodec.create();

    const enc = Encoder.create();
    codec.encode(cmd, enc);
    const decoded = codec.decode(Decoder.fromBlob(enc.finishRaw())).okay!;
    assert.isEqual<u32>(decoded.kind, AdminCommandKind.Provide, "kind");
    assert.isEqualBytes(decoded.preimage!, preimage, "preimage");
    return assert;
  }),

  test("admin: decode rejects unknown tag", () => {
    const assert = Assert.create();
    const codec = AdminCommandCodec.create();
    const bytes = BytesBlob.parseBlob("0x99").okay!.raw;
    const r = codec.decode(Decoder.fromBlob(bytes));
    assert.isEqual(r.isError, true, "should error");
    return assert;
  }),

  test("refine: unknown tag returns -106", () => {
    const assert = Assert.create();
    const resp = callRefine(BytesBlob.parseBlob("0x99").okay!.raw); // tag=0x99 unknown
    assert.isEqual(resp.result, -106, "result");
    return assert;
  }),

  test("refine: empty payload returns -106", () => {
    const assert = Assert.create();
    const resp = callRefine(new Uint8Array(0));
    assert.isEqual(resp.result, -106, "result");
    return assert;
  }),

  test("refine: admin path round-trips SetMapping canonically", () => {
    const assert = Assert.create();
    const hash = Bytes32.zero();
    hash.raw[0] = 0xaa;
    const cmd = AdminCommand.setMapping(BytesBlob.encodeAscii("ed25519"), hash, 4096);
    const codec = AdminCommandCodec.create();
    const body = Encoder.create();
    codec.encode(cmd, body);
    const bodyBytes = body.finishRaw();

    const input = Encoder.create();
    input.u8(1); // admin tag
    input.bytesFixLen(BytesBlob.wrap(bodyBytes));

    const resp = callRefine(input.finishRaw());
    assert.isEqual(resp.result, 0, "ok");
    assert.isEqualBytes(resp.data, BytesBlob.wrap(bodyBytes), "canonical body");
    return assert;
  }),

  test("refine: admin path rejects malformed bytes with -105", () => {
    const assert = Assert.create();
    const input = Encoder.create();
    input.u8(1); // admin tag
    input.u8(0x99); // unknown AdminCommand tag
    const resp = callRefine(input.finishRaw());
    assert.isEqual(resp.result, -105, "malformed");
    return assert;
  }),

  test("refine demo: unknown library name returns -100", () => {
    const assert = Assert.create();
    TestStorage.set(BytesBlob.wrap(libraryKey("missing")), null);

    const input = buildDemoInput("missing", 0, 1000, BytesBlob.empty());
    const resp = callRefine(input);
    assert.isEqual(resp.result, -100, "unknown library");
    return assert;
  }),

  test("refine demo: malformed stored entry returns -100", () => {
    const assert = Assert.create();
    // Store a value that is too short to decode a LibraryEntry (hash+length = 36 bytes).
    TestStorage.set(BytesBlob.wrap(libraryKey("corrupt")), BytesBlob.parseBlob("0xdead").okay!);

    const input = buildDemoInput("corrupt", 0, 1000, BytesBlob.empty());
    const resp = callRefine(input);
    assert.isEqual(resp.result, -100, "malformed entry treated as unknown");
    return assert;
  }),

  test("refine demo: preimage unavailable returns -101", () => {
    const assert = Assert.create();
    seedLibraryMapping("ed25519", 0xee, 64);
    TestHistoricalLookup.setNone();

    const input = buildDemoInput("ed25519", 0, 1000, BytesBlob.empty());
    const resp = callRefine(input);
    assert.isEqual(resp.result, -101, "preimage unavailable");
    return assert;
  }),

  test("refine demo: happy path returns peeked output", () => {
    const assert = Assert.create();
    seedLibraryMapping("echo", 0x01, 16);
    const seed = BytesBlob.parseBlob("0x00").okay!;
    TestHistoricalLookup.setPreimage(seed.raw);
    TestMachine.setMachineResult(0); // create OK, id = 0
    TestMachine.setPokeResult(0);
    TestMachine.setPagesResult(0);
    // invoke returns Halt (0); r7 post-invoke = packed ptrAndLen(ptr=0xFEFF2000, len=3)
    TestMachine.setInvokeResult(0, 0);
    TestMachine.setInvokeIoR7((i64(3) << 32) | i64(0xfeff2000));
    const expected = BytesBlob.parseBlob("0x010203").okay!;
    TestMachine.setPeekData(expected.raw);
    TestMachine.setExpungeResult(0);

    const input = buildDemoInput("echo", 0, 1000, BytesBlob.parseBlob("0xaabb").okay!);
    const resp = callRefine(input);
    assert.isEqual(resp.result, 0, "ok");
    assert.isEqualBytes(resp.data, expected, "peeked output");
    return assert;
  }),

  test("refine demo: invalid entrypoint returns -102", () => {
    const assert = Assert.create();
    seedLibraryMapping("bad", 0xaa, 16);
    TestHistoricalLookup.setPreimage(BytesBlob.parseBlob("0x00").okay!.raw);
    TestMachine.setMachineResult(-9); // HUH sentinel (InvalidEntryPoint)

    const resp = callRefine(buildDemoInput("bad", 0, 1000, BytesBlob.empty()));
    assert.isEqual(resp.result, -102, "invalid entrypoint");
    return assert;
  }),

  test("refine demo: invoke Panic returns -103 with reason+r8", () => {
    const assert = Assert.create();
    seedLibraryMapping("panic", 0xbb, 16);
    TestHistoricalLookup.setPreimage(BytesBlob.parseBlob("0x00").okay!.raw);
    TestMachine.setMachineResult(0);
    TestMachine.setPagesResult(0);
    TestMachine.setPokeResult(0);
    TestMachine.setInvokeResult(1, 42); // Panic, r8=42
    TestMachine.setExpungeResult(0);

    const resp = callRefine(buildDemoInput("panic", 0, 1000, BytesBlob.empty()));
    assert.isEqual(resp.result, -103, "invoke failure");
    const dec = Decoder.fromBlob(resp.data.raw);
    assert.isEqual(dec.u8(), u8(1), "reason = Panic");
    assert.isEqual(dec.u64(), u64(42), "r8 value preserved");
    assert.isEqual(dec.isError, false, "body decodes cleanly");
    return assert;
  }),

  test("refine demo: peek OOB returns -104", () => {
    const assert = Assert.create();
    seedLibraryMapping("oob", 0xcc, 16);
    TestHistoricalLookup.setPreimage(BytesBlob.parseBlob("0x00").okay!.raw);
    TestMachine.setMachineResult(0);
    TestMachine.setPagesResult(0);
    TestMachine.setPokeResult(0);
    TestMachine.setInvokeResult(0, 0); // Halt
    TestMachine.setInvokeIoR7((i64(3) << 32) | i64(0xfeff9000));
    TestMachine.setPeekResult(-3); // OOB sentinel
    TestMachine.setExpungeResult(0);

    const resp = callRefine(buildDemoInput("oob", 0, 1000, BytesBlob.empty()));
    assert.isEqual(resp.result, -104, "peek OOB");
    return assert;
  }),

  test("mock: setPeekData writes configured bytes to dest", () => {
    const assert = Assert.create();
    // Clear any error sentinel a prior test may have left in peekResult;
    // the mock now skips the memory write when peekResult is a negative sentinel.
    TestMachine.setPeekResult(0);
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
