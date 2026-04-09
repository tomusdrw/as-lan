// Ecalli 7: export — segment export counter.

let exportCounter = 0;
let overrideResult: bigint | null = null;

export function export_segment(
  _segment_ptr: number,
  _segment_len: number,
): bigint {
  if (overrideResult !== null) return overrideResult;
  return BigInt(exportCounter++);
}

export function setExportSegmentResult(value: bigint): void {
  overrideResult = value;
}

export function resetSegments(): void {
  exportCounter = 0;
  overrideResult = null;
}
