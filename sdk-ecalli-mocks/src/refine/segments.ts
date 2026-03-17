// Ecalli 7: export — segment export counter.

let exportCounter = 0;

export function export_(
  _segment_ptr: number,
  _segment_len: number,
): bigint {
  return BigInt(exportCounter++);
}

export function resetSegments(): void {
  exportCounter = 0;
}
