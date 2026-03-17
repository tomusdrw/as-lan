// Ecalli 7: export — segment export counter.
let exportCounter = 0;
export function export_(_segment_ptr, _segment_len) {
    return BigInt(exportCounter++);
}
export function resetSegments() {
    exportCounter = 0;
}
