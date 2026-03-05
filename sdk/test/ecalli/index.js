//// Stub implementations of host-provided imports for testing
let wasmMemory = null;

const LOG_LEVELS = ["FATAL", "WARN ", "INFO ", "DEBUG", "TRACE"];

function readUtf8(ptr, len) {
  if (!wasmMemory || !len) return null;
  const bytes = new Uint8Array(wasmMemory.buffer, ptr, len);
  return new TextDecoder().decode(bytes);
}

export function setMemory(memory) {
  wasmMemory = memory;
}

export function gas() {
  return 0n;
}

export function lookup(_service, _hash_ptr, _out_ptr, _out_len) {
  return 0;
}

export function log(level, target_ptr, target_len, message_ptr, message_len) {
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
