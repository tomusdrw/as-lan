import { BytesBlob } from "../core/bytes";
import { Decoder } from "../core/codec";
import { Assert, Test, test } from "../test";
import { ImportSpec, PackageInfo, RefineContext, WorkItem, WorkItemExtrinsicSpec } from "./types";

export const TESTS: Test[] = [
  test("decode refine context", () => {
    const data = BytesBlob.parseBlob(
      "0x5c743dbc514284b2ea57798787c5a155ef9d7ac1e9499ec65910a7a3d65897b72591ebd047489f1006361a4254731466a946174af02fe1d86681d254cfd4a00b74a9e79d2618e0ce8720ff61811b10e045c02224a09299f04e404a9656e85c81ae85d6635e9ae539d0846b911ec86a27fe000f619b78bcac8a74b77e36f6dbcfffc99a3b010000000000000000000000000000000000000000000000000000000000000001",
    ).okay!;
    const decoder = Decoder.fromBlob(data.raw);
    const refContext = RefineContext.Codec.decode(decoder).okay!;

    // then
    const assert = new Assert();
    assert.isEqual(decoder.isError, false);
    assert.isEqual(decoder.isFinished(), true);
    assert.isEqualBytes(
      refContext.anchor,
      BytesBlob.parseBlob("0x5c743dbc514284b2ea57798787c5a155ef9d7ac1e9499ec65910a7a3d65897b7").okay!,
      "anchor",
    );
    assert.isEqualBytes(
      refContext.stateRoot,
      BytesBlob.parseBlob("0x2591ebd047489f1006361a4254731466a946174af02fe1d86681d254cfd4a00b").okay!,
      "stateRoot",
    );
    assert.isEqualBytes(
      refContext.beefyRoot,
      BytesBlob.parseBlob("0x74a9e79d2618e0ce8720ff61811b10e045c02224a09299f04e404a9656e85c81").okay!,
      "beefyRoot",
    );
    assert.isEqualBytes(
      refContext.lookupAnchor,
      BytesBlob.parseBlob("0xae85d6635e9ae539d0846b911ec86a27fe000f619b78bcac8a74b77e36f6dbcf").okay!,
      "lookupAnchor",
    );
    assert.isEqual(refContext.lookupAnchorSlot, 999999999, "lookupAnchorSlot");
    assert.isEqual(refContext.prerequisites.length, 1, "prerequisites.length");
    assert.isEqualBytes(
      refContext.prerequisites[0],
      BytesBlob.parseBlob("0x0000000000000000000000000000000000000000000000000000000000000001").okay!,
      "prerequisites[0]",
    );
    return assert;
  }),
  test("decode package info", () => {
    const data = BytesBlob.parseBlob(
      "0x00000000000000000000000000000000000000000000000000000000000000005c743dbc514284b2ea57798787c5a155ef9d7ac1e9499ec65910a7a3d65897b75c743dbc514284b2ea57798787c5a155ef9d7ac1e9499ec65910a7a3d65897b75c743dbc514284b2ea57798787c5a155ef9d7ac1e9499ec65910a7a3d65897b75c743dbc514284b2ea57798787c5a155ef9d7ac1e9499ec65910a7a3d65897b715cd5b0700",
    ).okay!;
    const decoder = Decoder.fromBlob(data.raw);
    const packageInfo = decoder.object<PackageInfo>(PackageInfo.Codec).okay!;

    const assert = new Assert();
    assert.isEqual(decoder.isError, false);
    assert.isEqual(decoder.isFinished(), true);
    assert.isEqualBytes(
      packageInfo.packageHash,
      BytesBlob.parseBlob("0x0000000000000000000000000000000000000000000000000000000000000000").okay!,
      "packageHash",
    );
    return assert;
  }),
  test("decode work item extrinsic spec", () => {
    const data = BytesBlob.parseBlob("0x0000000000000000000000000000000000000000000000000000000000000005d2040000")
      .okay!;
    const decoder = Decoder.fromBlob(data.raw);
    const workItemExtrinsicSpec = decoder.object<WorkItemExtrinsicSpec>(WorkItemExtrinsicSpec.Codec).okay!;

    const assert = new Assert();
    assert.isEqual(decoder.isError, false);
    assert.isEqual(decoder.isFinished(), true);
    assert.isEqualBytes(
      workItemExtrinsicSpec.hash,
      BytesBlob.parseBlob("0x0000000000000000000000000000000000000000000000000000000000000005").okay!,
      "hash",
    );
    assert.isEqual(workItemExtrinsicSpec.len, 1234);
    return assert;
  }),
  test("decode import spec", () => {
    const data = BytesBlob.parseBlob("0x0000000000000000000000000000000000000000000000000000000000000005d204").okay!;
    const decoder = Decoder.fromBlob(data.raw);
    const importSpec = decoder.object<ImportSpec>(ImportSpec.Codec).okay!;

    const assert = new Assert();
    assert.isEqual(decoder.isError, false);
    assert.isEqual(decoder.isFinished(), true);
    assert.isEqualBytes(
      importSpec.treeRoot,
      BytesBlob.parseBlob("0x0000000000000000000000000000000000000000000000000000000000000005").okay!,
      "hash",
    );
    assert.isEqual(importSpec.index, 1234);
    return assert;
  }),
  test("decode work item", () => {
    const data = BytesBlob.parseBlob(
      "0x672b0000000000000000000000000000000000000000000000000000000000000000000504deadbeefde000000000000004d010000000000000100000000000000000000000000000000000000000000000000000000000000050100010000000000000000000000000000000000000000000000000000000000000005010000000500",
    ).okay!;
    const decoder = Decoder.fromBlob(data.raw);
    const workItem = decoder.object<WorkItem>(WorkItem.Codec).okay!;

    const assert = new Assert();
    assert.isEqual(decoder.isError, false);
    assert.isEqual(decoder.isFinished(), true);
    assert.isEqual(workItem.service, 11111);
    assert.isEqualBytes(
      workItem.codeHash,
      BytesBlob.parseBlob("0x0000000000000000000000000000000000000000000000000000000000000005").okay!,
      "codeHash",
    );
    assert.isEqualBytes(workItem.payload, BytesBlob.parseBlob("0xdeadbeef").okay!);
    assert.isEqual(workItem.refineGasLimit, 222);
    assert.isEqual(workItem.accumulateGasLimit, 333);
    assert.isEqual(workItem.importSegments.length, 1);
    assert.isEqual(workItem.extrinsic.length, 1);
    assert.isEqual(workItem.exportCount, 5);
    return assert;
  }),
];
