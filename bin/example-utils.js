export function hexToBytes(hex) {
  const noPrefix = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (noPrefix.length % 2 !== 0) {
    throw new Error("Hex must contain even number of characters");
  }
  const out = new Uint8Array(noPrefix.length / 2);
  for (let i = 0; i < noPrefix.length; i += 2) {
    out[i / 2] = Number.parseInt(noPrefix.slice(i, i + 2), 16);
  }
  return out;
}

export function bytesToHex(bytes) {
  let out = "0x";
  for (const b of bytes) {
    out += b.toString(16).padStart(2, "0");
  }
  return out;
}

export function leU32(value) {
  const out = new Uint8Array(4);
  out[0] = value & 0xff;
  out[1] = (value >>> 8) & 0xff;
  out[2] = (value >>> 16) & 0xff;
  out[3] = (value >>> 24) & 0xff;
  return out;
}

export function encodeLen(len) {
  if (len > 0x7f) {
    throw new Error("Example encoder supports only lengths <= 127");
  }
  return new Uint8Array([len]);
}

export function encodeBlob(bytes) {
  return concatBytes(encodeLen(bytes.length), bytes);
}

export function concatBytes(...arrays) {
  const len = arrays.reduce((acc, arr) => acc + arr.length, 0);
  const out = new Uint8Array(len);
  let offset = 0;
  for (const arr of arrays) {
    out.set(arr, offset);
    offset += arr.length;
  }
  return out;
}

export function zero32() {
  return new Uint8Array(32);
}

export function buildEmptyPackageInfo() {
  // packageHash + RefineContext(anchor, stateRoot, beefyRoot, lookupAnchor, lookupAnchorSlot, prerequisites[])
  return concatBytes(
    zero32(),
    zero32(),
    zero32(),
    zero32(),
    zero32(),
    leU32(0),
    encodeLen(0),
  );
}
