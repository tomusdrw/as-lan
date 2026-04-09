// @ts-expect-error: decorator
@external("ecalli", "setExportSegmentResult")
declare function _setExportSegmentResult(result: i64): void;

/** Configure the export_segment() stub return value. */
export class TestExportSegment {
  /** Override export_segment() to return a specific value (e.g. EcalliResult.FULL). */
  static setResult(result: i64): void {
    _setExportSegmentResult(result);
  }
}
