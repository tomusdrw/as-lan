/** Read bytes from raw WASM linear memory into a managed Uint8Array. */
export function readFromMemory(ptr: u32, len: u32): Uint8Array {
  const data = new Uint8Array(len);
  memory.copy(data.dataStart, ptr, len);
  return data;
}
