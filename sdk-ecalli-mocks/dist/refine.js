// Mock stubs for refine host calls (ecalli 6-13).
import { writeToMem, writeI64 } from "./memory.js";
// ---------------------------------------------------------------------------
// 6 — historical_lookup (same pattern as lookup)
// ---------------------------------------------------------------------------
const DEFAULT_HISTORICAL_PREIMAGE = new TextEncoder().encode("test-historical");
let historicalPreimage = DEFAULT_HISTORICAL_PREIMAGE;
export function setHistoricalLookupPreimage(data) {
    historicalPreimage = data;
}
export function historical_lookup(_service, _hash_ptr, out_ptr, offset, length) {
    writeToMem(out_ptr, historicalPreimage, offset, length);
    return BigInt(historicalPreimage.length);
}
// ---------------------------------------------------------------------------
// 7 — export (counter-based)
// ---------------------------------------------------------------------------
let exportCounter = 0;
export function export_(_segment_ptr, _segment_len) {
    return BigInt(exportCounter++);
}
// ---------------------------------------------------------------------------
// 8 — machine (counter-based)
// ---------------------------------------------------------------------------
let machineCounter = 0;
export function machine(_code_ptr, _code_len, _entrypoint) {
    return BigInt(machineCounter++);
}
// ---------------------------------------------------------------------------
// 9 — peek (returns OK)
// ---------------------------------------------------------------------------
export function peek(_machine_id, _dest_ptr, _source, _length) {
    return 0n; // OK
}
// ---------------------------------------------------------------------------
// 10 — poke (returns OK)
// ---------------------------------------------------------------------------
export function poke(_machine_id, _source_ptr, _dest, _length) {
    return 0n; // OK
}
// ---------------------------------------------------------------------------
// 11 — pages (returns OK)
// ---------------------------------------------------------------------------
export function pages(_machine_id, _start_page, _page_count, _access_type) {
    return 0n; // OK
}
// ---------------------------------------------------------------------------
// 12 — invoke (returns HALT = 0, r8 = 0)
// ---------------------------------------------------------------------------
export function invoke(_machine_id, _io_ptr, out_r8) {
    writeI64(out_r8, 0n);
    return 0n; // HALT
}
// ---------------------------------------------------------------------------
// 13 — expunge (returns OK)
// ---------------------------------------------------------------------------
export function expunge(_machine_id) {
    return 0n; // OK
}
// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------
export function resetRefine() {
    historicalPreimage = DEFAULT_HISTORICAL_PREIMAGE;
    exportCounter = 0;
    machineCounter = 0;
}
