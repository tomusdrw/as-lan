let wasmMemory: WebAssembly.Memory | null = null;

export function setMemory(memory: WebAssembly.Memory): void {
  wasmMemory = memory;
}

export function readUtf8(ptr: number, len: number): string | null {
  if (!wasmMemory || !len) return null;
  const bytes = new Uint8Array(wasmMemory.buffer, ptr, len);
  return new TextDecoder().decode(bytes);
}

export function readBytes(ptr: number, len: number): Uint8Array {
  if (!wasmMemory || !len) return new Uint8Array(0);
  return new Uint8Array(wasmMemory.buffer).slice(ptr, ptr + len);
}

export function writeToMem(ptr: number, data: Uint8Array, offset: number, maxLen: number): void {
  if (!wasmMemory) return;
  const len = Math.min(maxLen, data.length - offset);
  if (len > 0) {
    const view = new Uint8Array(wasmMemory.buffer);
    for (let i = 0; i < len; i++) {
      view[ptr + i] = data[offset + i];
    }
  }
}
