import { Bytes32, BytesBlob } from "../../core/bytes";
import { EcalliResult } from "../../ecalli";
import { TestEcalli, TestPrivileged } from "../../test/test-ecalli";
import { Assert, Test, test } from "../../test/utils";
import { AutoAccumulateEntry, CURRENT_SERVICE, ValidatorKey } from "../types";
import { Admin, AssignError, BlessError, DesignateError } from "./admin";

export const TESTS: Test[] = [
  // ─── bless ─────────────────────────────────────────────────────────

  test("Admin.bless encodes args and returns ok", () => {
    TestEcalli.reset();
    const a = Assert.create();
    const admin = Admin.create();

    const result = admin.bless(1, [2, 3], 4, 5, [AutoAccumulateEntry.create(100, 500)]);
    a.isEqual(result.isOkay, true, "should be ok");

    // Verify scalar args passed through correctly
    a.isEqual(TestPrivileged.getLastBlessManager(), 1, "manager");
    a.isEqual(TestPrivileged.getLastBlessDelegator(), 4, "delegator");
    a.isEqual(TestPrivileged.getLastBlessRegistrar(), 5, "registrar");
    a.isEqual(TestPrivileged.getLastBlessAutoAccumCount(), 1, "autoAccum count");

    // Verify assigners encoding: [2, 3] → 2 × u32 LE = 8 bytes
    const aPtr = TestPrivileged.getLastBlessAssignersPtr();
    a.isEqual(load<u32>(aPtr), 2, "assigners[0] = 2");
    a.isEqual(load<u32>(aPtr + 4), 3, "assigners[1] = 3");

    // Verify autoAccumulate encoding: [{ serviceId: 100, gas: 500 }] → u32 LE + u64 LE = 12 bytes
    const aaPtr = TestPrivileged.getLastBlessAutoAccumPtr();
    a.isEqual(load<u32>(aaPtr), 100, "autoAccum[0].serviceId = 100");
    a.isEqual(load<u64>(aaPtr + 4), 500, "autoAccum[0].gas = 500");
    return a;
  }),

  test("Admin.bless returns Who on WHO", () => {
    TestEcalli.reset();
    const a = Assert.create();
    const admin = Admin.create();

    TestPrivileged.setBlessResult(EcalliResult.WHO);
    const result = admin.bless(1, [], 4, 5, []);
    a.isEqual(result.isError, true, "should be error");
    a.isEqual(result.error, BlessError.Who, "should be Who");
    return a;
  }),

  test("Admin.bless returns Huh on HUH", () => {
    TestEcalli.reset();
    const a = Assert.create();
    const admin = Admin.create();

    TestPrivileged.setBlessResult(EcalliResult.HUH);
    const result = admin.bless(1, [], 4, 5, []);
    a.isEqual(result.isError, true, "should be error");
    a.isEqual(result.error, BlessError.Huh, "should be Huh");
    return a;
  }),

  // ─── blessDelegator ────────────────────────────────────────────────

  test("Admin.blessDelegator returns ok on success", () => {
    TestEcalli.reset();
    const a = Assert.create();
    const admin = Admin.create();

    const result = admin.blessDelegator(42);
    a.isEqual(result.isOkay, true, "should be ok");
    return a;
  }),

  test("Admin.blessDelegator returns Who on WHO", () => {
    TestEcalli.reset();
    const a = Assert.create();
    const admin = Admin.create();

    TestPrivileged.setBlessResult(EcalliResult.WHO);
    const result = admin.blessDelegator(42);
    a.isEqual(result.isError, true, "should be error");
    a.isEqual(result.error, BlessError.Who, "should be Who");
    return a;
  }),

  test("Admin.blessDelegator returns Huh on HUH", () => {
    TestEcalli.reset();
    const a = Assert.create();
    const admin = Admin.create();

    TestPrivileged.setBlessResult(EcalliResult.HUH);
    const result = admin.blessDelegator(42);
    a.isEqual(result.isError, true, "should be error");
    a.isEqual(result.error, BlessError.Huh, "should be Huh");
    return a;
  }),

  // ─── blessRegistrar ────────────────────────────────────────────────

  test("Admin.blessRegistrar returns ok on success", () => {
    TestEcalli.reset();
    const a = Assert.create();
    const admin = Admin.create();

    const result = admin.blessRegistrar(99);
    a.isEqual(result.isOkay, true, "should be ok");
    return a;
  }),

  test("Admin.blessRegistrar returns Who on WHO", () => {
    TestEcalli.reset();
    const a = Assert.create();
    const admin = Admin.create();

    TestPrivileged.setBlessResult(EcalliResult.WHO);
    const result = admin.blessRegistrar(99);
    a.isEqual(result.isError, true, "should be error");
    a.isEqual(result.error, BlessError.Who, "should be Who");
    return a;
  }),

  test("Admin.blessRegistrar returns Huh on HUH", () => {
    TestEcalli.reset();
    const a = Assert.create();
    const admin = Admin.create();

    TestPrivileged.setBlessResult(EcalliResult.HUH);
    const result = admin.blessRegistrar(99);
    a.isEqual(result.isError, true, "should be error");
    a.isEqual(result.error, BlessError.Huh, "should be Huh");
    return a;
  }),

  // ─── assign ────────────────────────────────────────────────────────

  test("Admin.assign encodes auth queue and uses default newAssigner", () => {
    TestEcalli.reset();
    const a = Assert.create();
    const admin = Admin.create();

    const hash1 = Bytes32.zero();
    hash1.raw[0] = 0xaa;
    const hash2 = Bytes32.zero();
    hash2.raw[0] = 0xbb;
    const result = admin.assign(7, [hash1, hash2]);
    a.isEqual(result.isOkay, true, "should be ok");

    // Verify scalar args
    a.isEqual(TestPrivileged.getLastAssignCore(), 7, "core = 7");
    a.isEqual(TestPrivileged.getLastAssignNewAssigner(), CURRENT_SERVICE, "default newAssigner = CURRENT_SERVICE");

    // Verify auth queue encoding: 2 × Bytes32 = 64 bytes, sequential
    const ptr = TestPrivileged.getLastAssignAuthQueuePtr();
    a.isEqual(load<u8>(ptr), 0xaa, "hash1[0] = 0xaa");
    a.isEqual(load<u8>(ptr + 32), 0xbb, "hash2[0] = 0xbb");
    return a;
  }),

  test("Admin.assign with explicit newAssigner passes it through", () => {
    TestEcalli.reset();
    const a = Assert.create();
    const admin = Admin.create();

    const result = admin.assign(0, [Bytes32.zero()], 42);
    a.isEqual(result.isOkay, true, "should be ok");
    a.isEqual(TestPrivileged.getLastAssignNewAssigner(), 42, "newAssigner = 42");
    return a;
  }),

  test("Admin.assign returns Core on CORE", () => {
    TestEcalli.reset();
    const a = Assert.create();
    const admin = Admin.create();

    TestPrivileged.setAssignResult(EcalliResult.CORE);
    const result = admin.assign(999, []);
    a.isEqual(result.isError, true, "should be error");
    a.isEqual(result.error, AssignError.Core, "should be Core");
    return a;
  }),

  test("Admin.assign returns Who on WHO", () => {
    TestEcalli.reset();
    const a = Assert.create();
    const admin = Admin.create();

    TestPrivileged.setAssignResult(EcalliResult.WHO);
    const result = admin.assign(0, []);
    a.isEqual(result.isError, true, "should be error");
    a.isEqual(result.error, AssignError.Who, "should be Who");
    return a;
  }),

  test("Admin.assign returns Huh on HUH", () => {
    TestEcalli.reset();
    const a = Assert.create();
    const admin = Admin.create();

    TestPrivileged.setAssignResult(EcalliResult.HUH);
    const result = admin.assign(0, []);
    a.isEqual(result.isError, true, "should be error");
    a.isEqual(result.error, AssignError.Huh, "should be Huh");
    return a;
  }),

  // ─── designate ─────────────────────────────────────────────────────

  test("Admin.designate encodes validator keys", () => {
    TestEcalli.reset();
    const a = Assert.create();
    const admin = Admin.create();

    const ed = Bytes32.zero();
    ed.raw[0] = 0xe0;
    const band = Bytes32.zero();
    band.raw[0] = 0xb0;
    const bls = BytesBlob.zero(144);
    bls.raw[0] = 0xbb;
    const meta = BytesBlob.zero(128);
    meta.raw[0] = 0xaa;

    const key = ValidatorKey.create(ed, band, bls, meta);
    const result = admin.designate([key]);
    a.isEqual(result.isOkay, true, "should be ok");

    // Verify validators encoding: Ed25519(32) + Bandersnatch(32) + BLS(144) + metadata(128) = 336 bytes
    const ptr = TestPrivileged.getLastDesignateValidatorsPtr();
    a.isEqual(load<u8>(ptr), 0xe0, "ed25519[0] = 0xe0");
    a.isEqual(load<u8>(ptr + 32), 0xb0, "bandersnatch[0] = 0xb0");
    a.isEqual(load<u8>(ptr + 64), 0xbb, "bls[0] = 0xbb");
    a.isEqual(load<u8>(ptr + 64 + 144), 0xaa, "metadata[0] = 0xaa");
    return a;
  }),

  test("Admin.designate returns Huh on HUH", () => {
    TestEcalli.reset();
    const a = Assert.create();
    const admin = Admin.create();

    TestPrivileged.setDesignateResult(EcalliResult.HUH);
    const result = admin.designate([]);
    a.isEqual(result.isError, true, "should be error");
    a.isEqual(result.error, DesignateError.Huh, "should be Huh");
    return a;
  }),
];
