/**
 * Ecalli 7: Export segment.
 *
 * Export a segment of data from the current work item.
 *
 * Registers:
 * - r7 (in)  = o — segment data memory address
 * - r7 (out)     — segment index on success, or FULL if limit reached
 * - r8 (in)  = z — segment data length
 *
 * @param segment_ptr - segment data memory address
 * @param segment_len - segment data length
 * @returns segment index on success, or FULL if limit reached
 */
// @ts-expect-error: decorator
@external("ecalli", "export")
export declare function export_(segment_ptr: u32, segment_len: u32): i64;
