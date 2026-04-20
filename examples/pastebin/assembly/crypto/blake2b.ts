// Blake2b-256 (RFC 7693), unkeyed, 32-byte output.
//
// This is a pure-AS reference implementation. Correctness is
// validated against RFC test vectors; performance is NOT tuned.
// If pastebin + token-UTXO both consume this, graduate it into
// `sdk/core/crypto/blake2b.ts` in the token-UTXO implementation plan.

const IV: u64[] = [
  0x6a09e667f3bcc908, 0xbb67ae8584caa73b,
  0x3c6ef372fe94f82b, 0xa54ff53a5f1d36f1,
  0x510e527fade682d1, 0x9b05688c2b3e6c1f,
  0x1f83d9abfb41bd6b, 0x5be0cd19137e2179,
];

const SIGMA: u8[][] = [
  [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9,10,11,12,13,14,15],
  [14,10, 4, 8, 9,15,13, 6, 1,12, 0, 2,11, 7, 5, 3],
  [11, 8,12, 0, 5, 2,15,13,10,14, 3, 6, 7, 1, 9, 4],
  [ 7, 9, 3, 1,13,12,11,14, 2, 6, 5,10, 4, 0,15, 8],
  [ 9, 0, 5, 7, 2, 4,10,15,14, 1,11,12, 6, 8, 3,13],
  [ 2,12, 6,10, 0,11, 8, 3, 4,13, 7, 5,15,14, 1, 9],
  [12, 5, 1,15,14,13, 4,10, 0, 7, 6, 3, 9, 2, 8,11],
  [13,11, 7,14,12, 1, 3, 9, 5, 0,15, 4, 8, 6, 2,10],
  [ 6,15,14, 9,11, 3, 0, 8,12, 2,13, 7, 1, 4,10, 5],
  [10, 2, 8, 4, 7, 6, 1, 5,15,11, 9,14, 3,12,13, 0],
  [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9,10,11,12,13,14,15],
  [14,10, 4, 8, 9,15,13, 6, 1,12, 0, 2,11, 7, 5, 3],
];

@inline
function rotr64(x: u64, n: u32): u64 {
  return (x >> n) | (x << (64 - n));
}

@inline
function g(v: u64[], a: i32, b: i32, c: i32, d: i32, x: u64, y: u64): void {
  v[a] = v[a] + v[b] + x;
  v[d] = rotr64(v[d] ^ v[a], 32);
  v[c] = v[c] + v[d];
  v[b] = rotr64(v[b] ^ v[c], 24);
  v[a] = v[a] + v[b] + y;
  v[d] = rotr64(v[d] ^ v[a], 16);
  v[c] = v[c] + v[d];
  v[b] = rotr64(v[b] ^ v[c], 63);
}

function compress(h: u64[], block: u64[], t: u64, last: bool): void {
  const v: u64[] = new Array<u64>(16);
  for (let i = 0; i < 8; i += 1) v[i] = h[i];
  for (let i = 0; i < 8; i += 1) v[8 + i] = IV[i];
  v[12] ^= t;
  v[13] ^= 0; // high 64 bits of counter — always 0 for pastebin-sized inputs
  if (last) v[14] ^= 0xffffffffffffffff;

  for (let r = 0; r < 12; r += 1) {
    const s = SIGMA[r];
    g(v, 0, 4,  8, 12, block[s[ 0]], block[s[ 1]]);
    g(v, 1, 5,  9, 13, block[s[ 2]], block[s[ 3]]);
    g(v, 2, 6, 10, 14, block[s[ 4]], block[s[ 5]]);
    g(v, 3, 7, 11, 15, block[s[ 6]], block[s[ 7]]);
    g(v, 0, 5, 10, 15, block[s[ 8]], block[s[ 9]]);
    g(v, 1, 6, 11, 12, block[s[10]], block[s[11]]);
    g(v, 2, 7,  8, 13, block[s[12]], block[s[13]]);
    g(v, 3, 4,  9, 14, block[s[14]], block[s[15]]);
  }

  for (let i = 0; i < 8; i += 1) h[i] ^= v[i] ^ v[i + 8];
}

function readLE64(buf: Uint8Array, offset: i32): u64 {
  let r: u64 = 0;
  for (let i = 0; i < 8; i += 1) r |= u64(buf[offset + i]) << u64(i * 8);
  return r;
}

function writeLE64(out: Uint8Array, offset: i32, v: u64): void {
  for (let i = 0; i < 8; i += 1) out[offset + i] = u8((v >> u64(i * 8)) & 0xff);
}

/**
 * Blake2b-256: unkeyed, 32-byte output.
 * Matches RFC 7693 for `outlen=32, key=empty`.
 */
export function blake2b256(input: Uint8Array): Uint8Array {
  // Parameter block for unkeyed 32-byte output:
  //   h[0] ^= 0x0101kknn where kk=keylen=0, nn=outlen=32 → 0x01010020
  const h: u64[] = new Array<u64>(8);
  for (let i = 0; i < 8; i += 1) h[i] = IV[i];
  h[0] ^= 0x0101_0020;

  const block: u64[] = new Array<u64>(16);
  const inLen = input.length;
  let t: u64 = 0;
  let offset: i32 = 0;

  // Compress all full 128-byte blocks except the last.
  // Strict > so that inputs that are an exact multiple of 128 still have a final block
  // (RFC 7693 requires the last compression to be flagged with f0 = 0xff…ff).
  while (inLen - offset > 128) {
    for (let i = 0; i < 16; i += 1) block[i] = readLE64(input, offset + i * 8);
    t += 128;
    compress(h, block, t, false);
    offset += 128;
  }

  // Final block (may be partial; even empty input ends here with a zero block).
  const finalLen = inLen - offset;
  for (let i = 0; i < 16; i += 1) block[i] = 0;
  const tail = new Uint8Array(128);
  for (let i = 0; i < finalLen; i += 1) tail[i] = input[offset + i];
  for (let i = 0; i < 16; i += 1) block[i] = readLE64(tail, i * 8);
  t += u64(finalLen);
  compress(h, block, t, true);

  const out = new Uint8Array(32);
  for (let i = 0; i < 4; i += 1) writeLE64(out, i * 8, h[i]);
  return out;
}
