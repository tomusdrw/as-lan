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
