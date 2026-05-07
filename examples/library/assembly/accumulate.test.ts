import { AccumulateContext, Bytes32, BytesBlob, CurrentServiceData, Decoder, Encoder } from "@fluffylabs/as-lan";
import {
  AccumulateCall,
  Assert,
  OperandItem,
  Test,
  TestAccumulate,
  TestPreimages,
  TestStorage,
  test,
} from "@fluffylabs/as-lan/test";
import { accumulate } from "./accumulate";
import { AdminCommand, AdminCommandCodec } from "./admin";
import { LibraryEntry, LibraryEntryCodec, libraryKey } from "./storage";

function encodeAdmin(cmd: AdminCommand): BytesBlob {
  const enc = Encoder.create();
  AdminCommandCodec.create().encode(cmd, enc);
  return enc.finish();
}

/** Wrap admin command bytes in an Operand item. */
function adminOperand(bytes: BytesBlob): BytesBlob {
  return OperandItem.create().withOkBlob(bytes).build();
}

/** Run accumulate with `argsLength` operands pre-seeded via TestAccumulate.setItem. */
function callAccumulate(argsLength: u32): BytesBlob {
  return AccumulateCall.create().call(accumulate, argsLength);
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
    TestStorage.set(libraryKey("blake2b"), entryEnc.finish());

    const cmd = AdminCommand.removeMapping(BytesBlob.encodeAscii("blake2b"));
    TestAccumulate.setItem(0, adminOperand(encodeAdmin(cmd)));
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
    TestAccumulate.setItem(0, adminOperand(encodeAdmin(cmd)));
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
    TestAccumulate.setItem(0, adminOperand(encodeAdmin(cmd)));
    callAccumulate(1);
    assert.isEqual(TestPreimages.getForgetCount(), 1, "forget count");
    return assert;
  }),

  test("accumulate: Provide calls provide ecalli", () => {
    const assert = Assert.create();
    TestPreimages.resetCounters();
    const cmd = AdminCommand.provide(BytesBlob.parseBlob("0xdeadbeef").okay!);
    TestAccumulate.setItem(0, adminOperand(encodeAdmin(cmd)));
    callAccumulate(1);
    assert.isEqual(TestPreimages.getProvideCount(), 1, "provide count");
    return assert;
  }),

  test("accumulate: malformed operand bytes are skipped silently", () => {
    const assert = Assert.create();
    TestPreimages.resetCounters();
    TestAccumulate.setItem(0, adminOperand(BytesBlob.parseBlob("0x99ff").okay!));
    const hash = Bytes32.zero();
    const good = encodeAdmin(AdminCommand.solicit(hash, 1));
    TestAccumulate.setItem(1, adminOperand(good));
    callAccumulate(2);
    assert.isEqual(TestPreimages.getSolicitCount(), 1, "good operand still dispatched");
    return assert;
  }),

  test("accumulate: operands dispatched in index order", () => {
    const assert = Assert.create();
    // Set then Remove → storage ends empty. Reversed order would leave the
    // entry present. Observable side-effect therefore depends on ordering.
    TestStorage.set(libraryKey("ordered"), null);
    const hash = Bytes32.zero();
    hash.raw[0] = 0x55;
    TestAccumulate.setItem(
      0,
      adminOperand(encodeAdmin(AdminCommand.setMapping(BytesBlob.encodeAscii("ordered"), hash, 16))),
    );
    TestAccumulate.setItem(1, adminOperand(encodeAdmin(AdminCommand.removeMapping(BytesBlob.encodeAscii("ordered")))));
    callAccumulate(2);

    const got = CurrentServiceData.create().read(libraryKey("ordered"));
    assert.isEqual(got.isSome, false, "Remove ran after Set");
    return assert;
  }),

  test("accumulate: SetMapping writes LibraryEntry to storage", () => {
    const assert = Assert.create();
    TestStorage.set(libraryKey("ed25519"), null);

    const hash = Bytes32.zero();
    hash.raw[0] = 0xab;
    const cmd = AdminCommand.setMapping(BytesBlob.encodeAscii("ed25519"), hash, 8192);
    TestAccumulate.setItem(0, adminOperand(encodeAdmin(cmd)));
    callAccumulate(1);

    const sd = CurrentServiceData.create();
    const got = sd.read(libraryKey("ed25519"));
    if (!got.isSome) {
      assert.fail("entry not written");
      return assert;
    }
    const decoded = LibraryEntryCodec.create().decode(Decoder.fromBytesBlob(got.val!)).okay!;
    assert.isEqualBytes(decoded.hash.bytes, hash.bytes, "hash");
    assert.isEqual(decoded.length, 8192, "length");
    return assert;
  }),
];
