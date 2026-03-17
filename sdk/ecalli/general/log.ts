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
// @ts-expect-error: decorator
@external("ecalli", "log")
export declare function log(level: u32, target_ptr: u32, target_len: u32, message_ptr: u32, message_len: u32): u32;
