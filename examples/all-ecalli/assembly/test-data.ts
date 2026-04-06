import { Bytes32, BytesBlob, Encoder, TryEncode } from "@fluffylabs/as-lan";

// ─── Test protocol constants (must match host configuration) ─────────

/** Number of auth queue slots. */
export const AUTH_QUEUE_SLOTS: u32 = 2;
/** Max authorizers per core. */
export const AUTH_QUEUE_AUTHS_PER_CORE: u32 = 2;
/** Number of auto-accumulate service entries. */
export const AUTO_ACCUM_COUNT: u32 = 2;
/** Number of validators. */
export const VALIDATORS_COUNT: u32 = 6;

// ─── AuthQueue ──────────────────────────────────────────────────────

/**
 * Auth queue: a fixed grid of Q slots × O code hashes (32 bytes each).
 *
 * Each hash is filled with a test pattern: byte[0]=slot, byte[1]=auth_index,
 * remaining bytes=0xCC so the host can identify each entry.
 */
export class AuthQueue {
  static create(slots: u32 = AUTH_QUEUE_SLOTS, authsPerCore: u32 = AUTH_QUEUE_AUTHS_PER_CORE): AuthQueue {
    const hashes: Bytes32[] = [];
    for (let q: u32 = 0; q < slots; q++) {
      for (let o: u32 = 0; o < authsPerCore; o++) {
        const raw = new Uint8Array(32);
        raw[0] = u8(q);
        raw[1] = u8(o);
        raw.fill(0xcc, 2);
        hashes.push(Bytes32.wrapUnchecked(raw));
      }
    }
    return new AuthQueue(hashes);
  }

  private constructor(public readonly hashes: Bytes32[]) {}

  encode(): BytesBlob {
    const enc = Encoder.create(<u32>this.hashes.length * 32);
    const codec = AuthQueueCodec.create();
    codec.encode(this, enc);
    return enc.finish();
  }
}

export class AuthQueueCodec implements TryEncode<AuthQueue> {
  static create(): AuthQueueCodec {
    return new AuthQueueCodec();
  }

  private constructor() {}

  encode(value: AuthQueue, e: Encoder): void {
    for (let i = 0; i < value.hashes.length; i++) {
      e.bytes32(value.hashes[i]);
    }
  }
}

// ─── AutoAccumulate ────────────────────────────────────────────────

/**
 * Auto-accumulate service list: a fixed-length array of u32 service IDs.
 *
 * Uses service IDs 100, 200, ... so they're easy to spot on the host side.
 */
export class AutoAccumulate {
  static create(count: u32 = AUTO_ACCUM_COUNT): AutoAccumulate {
    const ids: u32[] = [];
    for (let i: u32 = 0; i < count; i++) {
      ids.push((i + 1) * 100);
    }
    return new AutoAccumulate(ids);
  }

  private constructor(public readonly serviceIds: u32[]) {}

  encode(): BytesBlob {
    const enc = Encoder.create(<u32>this.serviceIds.length * 4);
    const codec = AutoAccumulateCodec.create();
    codec.encode(this, enc);
    return enc.finish();
  }
}

export class AutoAccumulateCodec implements TryEncode<AutoAccumulate> {
  static create(): AutoAccumulateCodec {
    return new AutoAccumulateCodec();
  }

  private constructor() {}

  encode(value: AutoAccumulate, e: Encoder): void {
    for (let i = 0; i < value.serviceIds.length; i++) {
      e.u32(value.serviceIds[i]);
    }
  }
}

// ─── ValidatorKey ──────────────────────────────────────────────────

/** Size of a single validator key: Ed25519(32) + Bandersnatch(32) + BLS(144) + metadata(128). */
const VALIDATOR_KEY_SIZE: u32 = 336;

/**
 * Validator key: Ed25519(32) + Bandersnatch(32) + BLS(144) + metadata(128) = 336 bytes.
 *
 * Each section is filled with a marker byte so the host can verify alignment:
 *   Ed25519:      0xE0 | validator_index
 *   Bandersnatch:  0xB0 | validator_index
 *   BLS:          0xBB (first byte = validator_index)
 *   metadata:     0xAA (first byte = validator_index)
 */
export class ValidatorKey {
  static create(index: u32): ValidatorKey {
    const ed = new Uint8Array(32);
    ed.fill(0xe0 | u8(index));

    const bandersnatch = new Uint8Array(32);
    bandersnatch.fill(0xb0 | u8(index));

    const bls = new Uint8Array(144);
    bls.fill(0xbb);
    bls[0] = u8(index);

    const metadata = new Uint8Array(128);
    metadata.fill(0xaa);
    metadata[0] = u8(index);

    return new ValidatorKey(
      BytesBlob.wrap(ed),
      BytesBlob.wrap(bandersnatch),
      BytesBlob.wrap(bls),
      BytesBlob.wrap(metadata),
    );
  }

  private constructor(
    public readonly ed25519: BytesBlob,
    public readonly bandersnatch: BytesBlob,
    public readonly bls: BytesBlob,
    public readonly metadata: BytesBlob,
  ) {}
}

export class ValidatorKeyCodec implements TryEncode<ValidatorKey> {
  static create(): ValidatorKeyCodec {
    return new ValidatorKeyCodec();
  }

  private constructor() {}

  encode(value: ValidatorKey, e: Encoder): void {
    e.bytesFixLen(value.ed25519);
    e.bytesFixLen(value.bandersnatch);
    e.bytesFixLen(value.bls);
    e.bytesFixLen(value.metadata);
  }
}

/**
 * A list of validator keys for the designate ecalli.
 */
export class ValidatorKeys {
  static create(count: u32 = VALIDATORS_COUNT): ValidatorKeys {
    const keys: ValidatorKey[] = [];
    for (let v: u32 = 0; v < count; v++) {
      keys.push(ValidatorKey.create(v));
    }
    return new ValidatorKeys(keys);
  }

  private constructor(public readonly keys: ValidatorKey[]) {}

  encode(): BytesBlob {
    const enc = Encoder.create(<u32>this.keys.length * VALIDATOR_KEY_SIZE);
    const codec = ValidatorKeysCodec.create();
    codec.encode(this, enc);
    return enc.finish();
  }
}

export class ValidatorKeysCodec implements TryEncode<ValidatorKeys> {
  static create(): ValidatorKeysCodec {
    return new ValidatorKeysCodec();
  }

  private constructor() {}

  encode(value: ValidatorKeys, e: Encoder): void {
    const keyCodec = ValidatorKeyCodec.create();
    for (let i = 0; i < value.keys.length; i++) {
      e.object<ValidatorKey>(keyCodec, value.keys[i]);
    }
  }
}
