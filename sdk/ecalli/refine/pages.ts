/**
 * Ecalli 11: Set inner machine page access.
 *
 * Configure page access permissions for an inner PVM machine.
 *
 * Registers:
 * - r7 (in)  = m — machine ID
 * - r7 (out)     — OK, WHO (unknown machine), or HUH (invalid access type)
 * - r8 (in)  = p — start page index
 * - r9 (in)  = n — page count
 * - r10 (in) = a — access type
 *
 * @param machine_id - inner machine ID
 * @param start_page - start page index
 * @param page_count - number of pages
 * @param access_type - access permission type
 * @returns OK, WHO, or HUH
 */
// @ts-expect-error: decorator
@external("ecalli", "pages")
export declare function pages(machine_id: u32, start_page: u32, page_count: u32, access_type: u32): i64;
