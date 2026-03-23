import { Bytes32, BytesBlob } from "../core/bytes";
import { Decoder, TryDecode } from "../core/codec/decode";
import { Encoder, TryEncode } from "../core/codec/encode";
import { Assert, Test, test } from "../test/utils";
import {
  AuthorizerInfo, authorizerInfoCodec,
  ExtrinsicRef, extrinsicRefCodec,
  ImportRef, importRefCodec,
  ProtocolConstants, protocolConstantsCodec,
  RefinementContext, refinementContextCodec,
  WorkItem, workItemCodec,
  WorkItemInfo, workItemInfoCodec,
  WorkPackage, workPackageCodec,
} from "./work-package";

function bytes32Fill(v: u8): Bytes32 {
  const raw = new Uint8Array(32);
  raw.fill(v);
  return Bytes32.wrapUnchecked(raw);
}

function roundtrip<T>(original: T, enc: TryEncode<T>, dec: TryDecode<T>): T {
  const e = Encoder.create();
  enc.encode(original, e);
  const d = Decoder.fromBlob(e.finish());
  const r = dec.decode(d);
  assert(r.isOkay, "roundtrip decode failed");
  return r.okay!;
}

export const TESTS: Test[] = [
  // ─── ProtocolConstants ───

  test("ProtocolConstants roundtrip", () => {
    const original = ProtocolConstants.create(
      10_000_000,
      100,
      1_000_000_000, // B_I, B_L, B_S
      341,
      19200,
      600, // C, D, E
      500_000,
      50_000_000,
      5_000_000_000,
      10_000_000_000, // G_A, G_I, G_R, G_T
      24,
      16,
      8,
      16, // H, I, J, K
      14400, // L
      2,
      10,
      6,
      80,
      4,
      128,
      5, // N, O, P, Q, R, T, U
      1023, // V
      12582912,
      4194304,
      65536,
      684, // W_A, W_B, W_C, W_E
      3072,
      6,
      48000,
      128,
      3072,
      15, // W_M, W_P, W_R, W_T, W_X, Y
    );
    const decoded = roundtrip<ProtocolConstants>(
      original,
      protocolConstantsCodec, protocolConstantsCodec,
    );

    const assert = Assert.create();
    assert.isEqual(decoded.electiveItemBalance, 10_000_000, "B_I");
    assert.isEqual(decoded.electiveByteBalance, 100, "B_L");
    assert.isEqual(decoded.baseServiceBalance, 1_000_000_000, "B_S");
    assert.isEqual(decoded.coreCount, 341, "C");
    assert.isEqual(decoded.preimageExpungePeriod, 19200, "D");
    assert.isEqual(decoded.epochLength, 600, "E");
    assert.isEqual(decoded.gasAccumulateReport, 500_000, "G_A");
    assert.isEqual(decoded.gasIsAuthorized, 50_000_000, "G_I");
    assert.isEqual(decoded.gasMaxRefine, 5_000_000_000, "G_R");
    assert.isEqual(decoded.gasMaxBlock, 10_000_000_000, "G_T");
    assert.isEqual(decoded.recentHistoryLength, 24, "H");
    assert.isEqual(decoded.maxWorkItems, 16, "I");
    assert.isEqual(decoded.maxReportDeps, 8, "J");
    assert.isEqual(decoded.maxTicketsPerExtrinsic, 16, "K");
    assert.isEqual(decoded.maxLookupAnchorAge, 14400, "L");
    assert.isEqual(decoded.ticketsPerValidator, 2, "N");
    assert.isEqual(decoded.maxAuthorizersPerCore, 10, "O");
    assert.isEqual(decoded.slotDuration, 6, "P");
    assert.isEqual(decoded.authorizersQueueSize, 80, "Q");
    assert.isEqual(decoded.rotationPeriod, 4, "R");
    assert.isEqual(decoded.maxExtrinsicsPerWorkItem, 128, "T");
    assert.isEqual(decoded.reportTimeoutGracePeriod, 5, "U");
    assert.isEqual(decoded.validatorsCount, 1023, "V");
    assert.isEqual(decoded.maxAllocatedWorkPackageSize, 12582912, "W_A");
    assert.isEqual(decoded.maxEncodedWorkPackageSize, 4194304, "W_B");
    assert.isEqual(decoded.maxAuthorizerCodeSize, 65536, "W_C");
    assert.isEqual(decoded.erasureCodedPieceSize, 684, "W_E");
    assert.isEqual(decoded.maxImportSegments, 3072, "W_M");
    assert.isEqual(decoded.ecPiecesPerSegment, 6, "W_P");
    assert.isEqual(decoded.maxWorkReportSize, 48000, "W_R");
    assert.isEqual(decoded.transferMemoSize, 128, "W_T");
    assert.isEqual(decoded.maxExportSegments, 3072, "W_X");
    assert.isEqual(decoded.contestLength, 15, "Y");
    return assert;
  }),

  // ─── AuthorizerInfo ───

  test("AuthorizerInfo roundtrip", () => {
    const original = AuthorizerInfo.create(bytes32Fill(0xaa), BytesBlob.parseBlob("0xdeadbeef").okay!);
    const decoded = roundtrip<AuthorizerInfo>(
      original,
      authorizerInfoCodec, authorizerInfoCodec,
    );

    const assert = Assert.create();
    assert.isEqualBytes(BytesBlob.wrap(decoded.codeHash.raw), BytesBlob.wrap(bytes32Fill(0xaa).raw), "codeHash");
    assert.isEqualBytes(decoded.config, BytesBlob.parseBlob("0xdeadbeef").okay!, "config");
    return assert;
  }),

  test("AuthorizerInfo roundtrip empty config", () => {
    const original = AuthorizerInfo.create(bytes32Fill(0x00), BytesBlob.empty());
    const decoded = roundtrip<AuthorizerInfo>(
      original,
      authorizerInfoCodec, authorizerInfoCodec,
    );

    const assert = Assert.create();
    assert.isEqualBytes(BytesBlob.wrap(decoded.codeHash.raw), BytesBlob.wrap(bytes32Fill(0x00).raw), "codeHash");
    assert.isEqualBytes(decoded.config, BytesBlob.empty(), "empty config");
    return assert;
  }),

  // ─── RefinementContext ───

  test("RefinementContext roundtrip with prerequisites", () => {
    const prereqs = new StaticArray<Bytes32>(2);
    prereqs[0] = bytes32Fill(0x11);
    prereqs[1] = bytes32Fill(0x22);
    const original = RefinementContext.create(
      bytes32Fill(0x01),
      bytes32Fill(0x02),
      bytes32Fill(0x03),
      bytes32Fill(0x04),
      12345,
      prereqs,
    );
    const decoded = roundtrip<RefinementContext>(
      original,
      refinementContextCodec, refinementContextCodec,
    );

    const assert = Assert.create();
    assert.isEqualBytes(BytesBlob.wrap(decoded.anchor.raw), BytesBlob.wrap(bytes32Fill(0x01).raw), "anchor");
    assert.isEqualBytes(BytesBlob.wrap(decoded.stateRoot.raw), BytesBlob.wrap(bytes32Fill(0x02).raw), "stateRoot");
    assert.isEqualBytes(BytesBlob.wrap(decoded.beefyRoot.raw), BytesBlob.wrap(bytes32Fill(0x03).raw), "beefyRoot");
    assert.isEqualBytes(
      BytesBlob.wrap(decoded.lookupAnchor.raw),
      BytesBlob.wrap(bytes32Fill(0x04).raw),
      "lookupAnchor",
    );
    assert.isEqual(decoded.timeslot, 12345, "timeslot");
    assert.isEqual(decoded.prerequisites.length, 2, "prereq count");
    assert.isEqualBytes(
      BytesBlob.wrap(decoded.prerequisites[0].raw),
      BytesBlob.wrap(bytes32Fill(0x11).raw),
      "prereq[0]",
    );
    assert.isEqualBytes(
      BytesBlob.wrap(decoded.prerequisites[1].raw),
      BytesBlob.wrap(bytes32Fill(0x22).raw),
      "prereq[1]",
    );
    return assert;
  }),

  test("RefinementContext roundtrip no prerequisites", () => {
    const original = RefinementContext.create(
      bytes32Fill(0xff),
      bytes32Fill(0xee),
      bytes32Fill(0xdd),
      bytes32Fill(0xcc),
      0,
      new StaticArray<Bytes32>(0),
    );
    const decoded = roundtrip<RefinementContext>(
      original,
      refinementContextCodec, refinementContextCodec,
    );

    const assert = Assert.create();
    assert.isEqual(decoded.timeslot, 0, "timeslot zero");
    assert.isEqual(decoded.prerequisites.length, 0, "no prereqs");
    return assert;
  }),

  // ─── WorkItemInfo (summary) ───

  test("WorkItemInfo roundtrip", () => {
    const original = WorkItemInfo.create(42, bytes32Fill(0xab), 100000, 50000, 3, 5, 2, 1024);
    const decoded = roundtrip<WorkItemInfo>(
      original,
      workItemInfoCodec, workItemInfoCodec,
    );

    const assert = Assert.create();
    assert.isEqual(decoded.serviceId, 42, "serviceId");
    assert.isEqualBytes(BytesBlob.wrap(decoded.codeHash.raw), BytesBlob.wrap(bytes32Fill(0xab).raw), "codeHash");
    assert.isEqual(decoded.gasRefine, 100000, "gasRefine");
    assert.isEqual(decoded.gasAccumulate, 50000, "gasAccumulate");
    assert.isEqual(decoded.exportCount, 3, "exportCount");
    assert.isEqual(decoded.importCount, 5, "importCount");
    assert.isEqual(decoded.extrinsicCount, 2, "extrinsicCount");
    assert.isEqual(decoded.payloadLength, 1024, "payloadLength");
    return assert;
  }),

  // ─── ImportRef ───

  test("ImportRef roundtrip segment-root hash", () => {
    const original = ImportRef.create(bytes32Fill(0xcc), false, 7);
    const decoded = roundtrip<ImportRef>(
      original,
      importRefCodec, importRefCodec,
    );

    const assert = Assert.create();
    assert.isEqualBytes(BytesBlob.wrap(decoded.hash.raw), BytesBlob.wrap(bytes32Fill(0xcc).raw), "hash");
    assert.isEqual(decoded.isWorkPackageHash, false, "isWorkPackageHash");
    assert.isEqual(decoded.index, 7, "index");
    return assert;
  }),

  test("ImportRef roundtrip work-package hash", () => {
    const original = ImportRef.create(bytes32Fill(0xdd), true, 0);
    const decoded = roundtrip<ImportRef>(
      original,
      importRefCodec, importRefCodec,
    );

    const assert = Assert.create();
    assert.isEqual(decoded.isWorkPackageHash, true, "isWorkPackageHash");
    assert.isEqual(decoded.index, 0, "index zero");
    return assert;
  }),

  // ─── ExtrinsicRef ───

  test("ExtrinsicRef roundtrip", () => {
    const original = ExtrinsicRef.create(bytes32Fill(0xee), 4096);
    const decoded = roundtrip<ExtrinsicRef>(
      original,
      extrinsicRefCodec, extrinsicRefCodec,
    );

    const assert = Assert.create();
    assert.isEqualBytes(BytesBlob.wrap(decoded.hash.raw), BytesBlob.wrap(bytes32Fill(0xee).raw), "hash");
    assert.isEqual(decoded.length, 4096, "length");
    return assert;
  }),

  // ─── WorkItem (full) ───

  test("WorkItem roundtrip with imports and extrinsics", () => {
    const imports = new StaticArray<ImportRef>(1);
    imports[0] = ImportRef.create(bytes32Fill(0x11), true, 3);
    const extrinsics = new StaticArray<ExtrinsicRef>(1);
    extrinsics[0] = ExtrinsicRef.create(bytes32Fill(0x22), 256);
    const payload = BytesBlob.parseBlob("0xcafe").okay!;

    const original = WorkItem.create(99, bytes32Fill(0xab), payload, 500000, 100000, 2, imports, extrinsics);
    const decoded = roundtrip<WorkItem>(
      original,
      workItemCodec, workItemCodec,
    );

    const assert = Assert.create();
    assert.isEqual(decoded.serviceId, 99, "serviceId");
    assert.isEqualBytes(BytesBlob.wrap(decoded.codeHash.raw), BytesBlob.wrap(bytes32Fill(0xab).raw), "codeHash");
    assert.isEqualBytes(decoded.payload, payload, "payload");
    assert.isEqual(decoded.gasRefine, 500000, "gasRefine");
    assert.isEqual(decoded.gasAccumulate, 100000, "gasAccumulate");
    assert.isEqual(decoded.exportCount, 2, "exportCount");
    assert.isEqual(decoded.imports.length, 1, "import count");
    assert.isEqual(decoded.imports[0].isWorkPackageHash, true, "import[0].isWpHash");
    assert.isEqual(decoded.imports[0].index, 3, "import[0].index");
    assert.isEqual(decoded.extrinsics.length, 1, "extrinsic count");
    assert.isEqual(decoded.extrinsics[0].length, 256, "extrinsic[0].length");
    return assert;
  }),

  test("WorkItem roundtrip empty manifest", () => {
    const original = WorkItem.create(
      0,
      bytes32Fill(0x00),
      BytesBlob.empty(),
      0,
      0,
      0,
      new StaticArray<ImportRef>(0),
      new StaticArray<ExtrinsicRef>(0),
    );
    const decoded = roundtrip<WorkItem>(
      original,
      workItemCodec, workItemCodec,
    );

    const assert = Assert.create();
    assert.isEqual(decoded.serviceId, 0, "serviceId zero");
    assert.isEqual(decoded.imports.length, 0, "no imports");
    assert.isEqual(decoded.extrinsics.length, 0, "no extrinsics");
    return assert;
  }),

  // ─── WorkPackage (full) ───

  test("WorkPackage roundtrip", () => {
    const ctx = RefinementContext.create(
      bytes32Fill(0x01),
      bytes32Fill(0x02),
      bytes32Fill(0x03),
      bytes32Fill(0x04),
      7777,
      new StaticArray<Bytes32>(0),
    );
    const item = WorkItem.create(
      42,
      bytes32Fill(0xab),
      BytesBlob.parseBlob("0xff").okay!,
      100000,
      50000,
      1,
      new StaticArray<ImportRef>(0),
      new StaticArray<ExtrinsicRef>(0),
    );
    const items = new StaticArray<WorkItem>(1);
    items[0] = item;

    const authToken = BytesBlob.parseBlob("0xaabbccdd").okay!;
    const authConfig = BytesBlob.parseBlob("0x1234").okay!;
    const original = WorkPackage.create(authToken, 10, bytes32Fill(0xcc), authConfig, ctx, items);
    const decoded = roundtrip<WorkPackage>(
      original,
      workPackageCodec, workPackageCodec,
    );

    const assert = Assert.create();
    assert.isEqualBytes(decoded.authToken, authToken, "authToken");
    assert.isEqual(decoded.authServiceId, 10, "authServiceId");
    assert.isEqualBytes(
      BytesBlob.wrap(decoded.authCodeHash.raw),
      BytesBlob.wrap(bytes32Fill(0xcc).raw),
      "authCodeHash",
    );
    assert.isEqualBytes(decoded.authConfig, authConfig, "authConfig");
    assert.isEqual(decoded.context.timeslot, 7777, "context.timeslot");
    assert.isEqual(decoded.workItems.length, 1, "workItem count");
    assert.isEqual(decoded.workItems[0].serviceId, 42, "workItems[0].serviceId");
    assert.isEqual(decoded.workItems[0].gasRefine, 100000, "workItems[0].gasRefine");
    return assert;
  }),
];
