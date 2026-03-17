import { Logger } from "@fluffylabs/as-lan";

export const logger: Logger = new Logger("ecalli-test");

/** Calculate how many bytes were written to the output buffer. */
export function outputLen(result: i64, offset: u32, maxLen: u32): u32 {
  if (result < 0) return 0;
  const total = u32(result);
  if (total <= offset) return 0;
  return min(maxLen, total - offset);
}
