import {
  AccumulateContext,
  Bytes32,
  BytesBlob,
  CurrentServiceData,
  Decoder,
  Encoder,
} from "@fluffylabs/as-lan";
import { Assert, Test, TestAccumulate, TestPreimages, TestStorage, test } from "@fluffylabs/as-lan/test";
import { AdminCommand, AdminCommandCodec } from "./admin";
import { LibraryEntry, LibraryEntryCodec, libraryKey } from "./storage";
import { buildAdminOperand, callAccumulate } from "./test-helpers";

function encodeAdmin(cmd: AdminCommand): Uint8Array {
  const enc = Encoder.create();
  AdminCommandCodec.create().encode(cmd, enc);
  return enc.finishRaw();
}

export const TESTS: Test[] = [
  test("mock: solicit counter increments on call", () => {
    const assert = Assert.create();
    TestPreimages.resetCounters();

    const ctx = AccumulateContext.create();
    ctx.preimages().solicit(Bytes32.zero(), 64);

    assert.isEqual(TestPreimages.getSolicitCount(), 1, "solicit count");
    assert.isEqual(TestPreimages.getForgetCount(), 0, "forget count");
    assert.isEqual(TestPreimages.getProvideCount(), 0, "provide count");
    return assert;
  }),

  test("accumulate: RemoveMapping deletes storage entry", () => {
    const assert = Assert.create();
    const hash = Bytes32.zero();
    hash.raw[0] = 0x11;
    const entryEnc = Encoder.create();
    LibraryEntryCodec.create().encode(LibraryEntry.create(hash, 32), entryEnc);
    TestStorage.set(BytesBlob.wrap(libraryKey("blake2b")), BytesBlob.wrap(entryEnc.finishRaw()));

    const cmd = AdminCommand.removeMapping(BytesBlob.encodeAscii("blake2b"));
    TestAccumulate.setItem(0, buildAdminOperand(encodeAdmin(cmd)));
    callAccumulate(1);

    const got = CurrentServiceData.create().read(libraryKey("blake2b"));
    assert.isEqual(got.isSome, false, "entry removed");
    return assert;
  }),

  test("accumulate: Solicit calls solicit ecalli", () => {
    const assert = Assert.create();
    TestPreimages.resetCounters();
    const hash = Bytes32.zero();
    hash.raw[0] = 0x22;
    const cmd = AdminCommand.solicit(hash, 1024);
    TestAccumulate.setItem(0, buildAdminOperand(encodeAdmin(cmd)));
    callAccumulate(1);
    assert.isEqual(TestPreimages.getSolicitCount(), 1, "solicit count");
    return assert;
  }),

  test("accumulate: Forget calls forget ecalli", () => {
    const assert = Assert.create();
    TestPreimages.resetCounters();
    const hash = Bytes32.zero();
    hash.raw[0] = 0x33;
    const cmd = AdminCommand.forget(hash, 512);
    TestAccumulate.setItem(0, buildAdminOperand(encodeAdmin(cmd)));
    callAccumulate(1);
    assert.isEqual(TestPreimages.getForgetCount(), 1, "forget count");
    return assert;
  }),

  test("accumulate: Provide calls provide ecalli", () => {
    const assert = Assert.create();
    TestPreimages.resetCounters();
    const cmd = AdminCommand.provide(BytesBlob.parseBlob("0xdeadbeef").okay!);
    TestAccumulate.setItem(0, buildAdminOperand(encodeAdmin(cmd)));
    callAccumulate(1);
    assert.isEqual(TestPreimages.getProvideCount(), 1, "provide count");
    return assert;
  }),

  test("accumulate: malformed operand bytes are skipped silently", () => {
    const assert = Assert.create();
    TestPreimages.resetCounters();
    TestAccumulate.setItem(0, buildAdminOperand(BytesBlob.parseBlob("0x99ff").okay!.raw));
    const hash = Bytes32.zero();
    const good = encodeAdmin(AdminCommand.solicit(hash, 1));
    TestAccumulate.setItem(1, buildAdminOperand(good));
    callAccumulate(2);
    assert.isEqual(TestPreimages.getSolicitCount(), 1, "good operand still dispatched");
    return assert;
  }),

  test("accumulate: multiple operands processed in order", () => {
    const assert = Assert.create();
    TestPreimages.resetCounters();
    const h1 = Bytes32.zero();
    h1.raw[0] = 0xaa;
    const h2 = Bytes32.zero();
    h2.raw[0] = 0xbb;
    TestAccumulate.setItem(0, buildAdminOperand(encodeAdmin(AdminCommand.solicit(h1, 1))));
    TestAccumulate.setItem(1, buildAdminOperand(encodeAdmin(AdminCommand.solicit(h2, 2))));
    callAccumulate(2);
    assert.isEqual(TestPreimages.getSolicitCount(), 2, "both dispatched");
    return assert;
  }),

  test("accumulate: SetMapping writes LibraryEntry to storage", () => {
    const assert = Assert.create();
    TestStorage.set(BytesBlob.wrap(libraryKey("ed25519")), null);

    const hash = Bytes32.zero();
    hash.raw[0] = 0xab;
    const cmd = AdminCommand.setMapping(BytesBlob.encodeAscii("ed25519"), hash, 8192);
    TestAccumulate.setItem(0, buildAdminOperand(encodeAdmin(cmd)));
    callAccumulate(1);

    const sd = CurrentServiceData.create();
    const got = sd.read(libraryKey("ed25519"));
    if (!got.isSome) {
      assert.fail("entry not written");
      return assert;
    }
    const decoded = LibraryEntryCodec.create().decode(Decoder.fromBlob(got.val!)).okay!;
    assert.isEqual(decoded.hash.raw[0], 0xab, "hash");
    assert.isEqual(decoded.length, 8192, "length");
    return assert;
  }),
];
