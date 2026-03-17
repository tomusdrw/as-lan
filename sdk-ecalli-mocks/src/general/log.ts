import { readUtf8 } from "../memory.js";

const LOG_LEVELS = ["FATAL", "WARN ", "INFO ", "DEBUG", "TRACE"];

export function log(
  level: number,
  target_ptr: number,
  target_len: number,
  message_ptr: number,
  message_len: number,
): number {
  const levelStr = LOG_LEVELS[level] ?? `LVL${level}`;
  const target = readUtf8(target_ptr, target_len);
  const message = readUtf8(message_ptr, message_len);

  if (target && message) {
    console.log(`[${levelStr}] ${target}: ${message}`);
  } else if (message) {
    console.log(`[${levelStr}] ${message}`);
  } else {
    console.log(`[${levelStr}] (ptr=${message_ptr} len=${message_len})`);
  }
  return 0;
}
