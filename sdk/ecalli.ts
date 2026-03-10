/**
 * Host call declarations for JAM services.
 *
 * These are extern functions provided by the JAM runtime (PVM host).
 * Each maps to an ecalli instruction at the PVM level.
 *
 * Register mapping conventions:
 * - r7 is the in/out register (first arg and return value)
 * - r8-r12 carry additional arguments
 *
 * Return value sentinel constants (u64):
 * - `NONE` = 2^64 - 1 — item does not exist
 * - `WHAT` = 2^64 - 2 — name unknown
 * - `OOB`  = 2^64 - 3 — memory index not accessible
 * - `WHO`  = 2^64 - 4 — index unknown
 * - `FULL` = 2^64 - 5 — storage full
 * - `CORE` = 2^64 - 6 — core index unknown
 * - `CASH` = 2^64 - 7 — insufficient funds
 * - `LOW`  = 2^64 - 8 — gas limit too low
 * - `HUH`  = 2^64 - 9 — invalid operation
 *
 * @see https://graypaper.fluffylabs.dev/#/ab2cdbd?v=0.7.2
 * @module
 */

/**
 * Ecalli 0: Gas remaining (Omega_G).
 *
 * Returns the remaining gas after this call.
 *
 * Registers:
 * - r7 (out) = remaining gas
 *
 * @returns remaining gas as i64
 */
export declare function gas(): i64;

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
 * Fetch kind values:
 * |  0 Constants           |  7 WorkPackage           | 14 AllTransfersAndOperands |
 * |  1 Entropy             |  8 Authorizer            | 15 OneTransferOrOperand    |
 * |  2 AuthorizerTrace     |  9 AuthorizationToken    |                            |
 * |  3 OtherWorkItemExtr.  | 10 RefineContext         |                            |
 * |  4 MyExtrinsics        | 11 AllWorkItems          |                            |
 * |  5 OtherWorkItemImports| 12 OneWorkItem           |                            |
 * |  6 MyImports           | 13 WorkItemPayload       |                            |
 *
 * @param dest_ptr - destination memory address
 * @param offset - offset within fetched data
 * @param length - max bytes to write
 * @param kind - fetch kind index (0-15)
 * @param param1 - work item or segment index
 * @param param2 - secondary index (kinds 3, 5 only)
 * @returns total data length, or NONE if unavailable
 */
export declare function fetch(dest_ptr: u32, offset: u32, length: u32, kind: u32, param1: u32, param2: u32): i64;

/**
 * Ecalli 2: Lookup preimage (Omega_L).
 *
 * Look up a preimage by its hash for the given (or current) service.
 *
 * Registers:
 * - r7  (in)  = a — service ID (u64_max = current service)
 * - r7  (out)     — total preimage length, or NONE if not found
 * - r8  (in)  = h — memory address of 32-byte hash
 * - r9  (in)  = o — destination memory address
 * - r10 (in)  = f — offset within preimage
 * - r11 (in)  = l — max length to write
 *
 * @param service - service ID (u32_max for current service)
 * @param hash_ptr - pointer to 32-byte blake2b hash
 * @param out_ptr - destination memory address
 * @param offset - offset within preimage blob
 * @param length - max bytes to write
 * @returns total preimage length, or NONE if not found
 */
export declare function lookup(service: u32, hash_ptr: u32, out_ptr: u32, offset: u32, length: u32): i64;

/**
 * Ecalli 3: Read storage (Omega_R).
 *
 * Read a value from service storage by key.
 *
 * Registers:
 * - r7  (in)  = a   — service ID (u64_max = current service)
 * - r7  (out)       — total value length, or NONE if not found
 * - r8  (in)  = k_o — storage key memory address
 * - r9  (in)  = k_z — storage key byte length
 * - r10 (in)  = o   — destination memory address
 * - r11 (in)  = f   — offset within value
 * - r12 (in)  = l   — max length to write
 *
 * @param service - service ID (u32_max for current service)
 * @param key_ptr - storage key memory address
 * @param key_len - storage key byte length
 * @param out_ptr - destination memory address
 * @param offset - offset within stored value
 * @param length - max bytes to write
 * @returns total value length, or NONE if not found
 */
export declare function read(service: u32, key_ptr: u32, key_len: u32, out_ptr: u32, offset: u32, length: u32): i64;

/**
 * Ecalli 4: Write storage (Omega_W).
 *
 * Write a value to the current service's storage.
 * Pass `value_len = 0` to delete the entry.
 *
 * Registers:
 * - r7  (in)  = k_o — storage key memory address
 * - r7  (out)       — previous value length, NONE (no prior value), or FULL
 * - r8  (in)  = k_z — storage key byte length
 * - r9  (in)  = v_o — value memory address
 * - r10 (in)  = v_z — value byte length (0 = delete)
 *
 * @param key_ptr - storage key memory address
 * @param key_len - storage key byte length
 * @param value_ptr - value memory address
 * @param value_len - value byte length (0 to delete)
 * @returns previous value length, NONE if no prior value, or FULL if storage full
 */
export declare function write(key_ptr: u32, key_len: u32, value_ptr: u32, value_len: u32): i64;

/**
 * Ecalli 5: Service info (Omega_I).
 *
 * Get account info for the given (or current) service.
 * Returns a 96-byte encoded structure:
 * - code_hash (32B), balance (8B), threshold_balance (8B),
 *   accumulate_min_gas (8B), on_transfer_min_gas (8B),
 *   storage_bytes (8B), storage_count (4B), gratis_storage (8B),
 *   created_slot (4B), last_accumulation_slot (4B), parent_service (4B)
 *
 * Registers:
 * - r7  (in)  = a — service ID (u64_max = current service)
 * - r7  (out)     — total info length (96), or NONE if account missing
 * - r8  (in)  = o — destination memory address
 * - r9  (in)  = f — offset within info
 * - r10 (in)  = l — max length to write
 *
 * @param service - service ID (u32_max for current service)
 * @param out_ptr - destination memory address
 * @param offset - offset within info structure
 * @param length - max bytes to write
 * @returns total info length (96), or NONE if account does not exist
 */
export declare function info(service: u32, out_ptr: u32, offset: u32, length: u32): i64;

/**
 * Ecalli 100: JIP-1 Debug log.
 *
 * Emit a debug message to the host logger.
 *
 * @param level - log level: 0=fatal, 1=warning, 2=important, 3=helpful, 4=pedantic
 * @param target_ptr - category string pointer (0 for none)
 * @param target_len - category string length (0 for none)
 * @param message_ptr - message string pointer
 * @param message_len - message string length
 * @returns 0 on success
 */
export declare function log(level: u32, target_ptr: u32, target_len: u32, message_ptr: u32, message_len: u32): u32;
