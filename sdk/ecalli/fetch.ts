/**
 * Ecalli 1: Fetch context data (Omega_Y).
 *
 * Fetch data for the current work item: constants, entropy,
 * extrinsics, imports, work package details, etc.
 *
 * Registers:
 * - r7  (in)  = o    — destination memory address
 * - r7  (out)        — total data length, or NONE if unavailable
 * - r8  (in)  = f    — offset within fetched data
 * - r9  (in)  = l    — max length to write
 * - r10 (in)  = kind — fetch kind index (0-15)
 * - r11 (in)         — work item / segment index (for kinds 3-6, 12-13, 15)
 * - r12 (in)         — secondary index (for kinds 3, 5)
 *
 * @param dest_ptr - destination memory address
 * @param offset - offset within fetched data
 * @param length - max bytes to write
 * @param kind - fetch kind index (0-15)
 * @param param1 - work item or segment index
 * @param param2 - secondary index (kinds 3, 5 only)
 * @returns total data length, or NONE if unavailable
 */
// @ts-expect-error: decorator
@external("ecalli", "fetch")
export declare function fetch(dest_ptr: u32, offset: u32, length: u32, kind: u32, param1: u32, param2: u32): i64;

/** Fetch kind index values for the `fetch` host call. */
export enum FetchKind {
  Constants = 0,
  Entropy = 1,
  AuthorizerTrace = 2,
  OtherWorkItemExtrinsics = 3,
  MyExtrinsics = 4,
  OtherWorkItemImports = 5,
  MyImports = 6,
  WorkPackage = 7,
  Authorizer = 8,
  AuthorizationToken = 9,
  RefineContext = 10,
  AllWorkItems = 11,
  OneWorkItem = 12,
  WorkItemPayload = 13,
  AllTransfersAndOperands = 14,
  OneTransferOrOperand = 15,
}
