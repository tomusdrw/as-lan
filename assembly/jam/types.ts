import { Bytes32, BytesBlob } from "../core/bytes";

// keccak256
export type MmrPeakHash = Bytes32;
// blake2b
export type StateRootHash = Bytes32;
// blake2b
export type HeaderHash = Bytes32;
// blake2b
export type CodeHash = Bytes32;
// blake2b
export type PayloadHash = Bytes32;
// blake2b
export type WorkPackageHash = Bytes32;

export type CoreIndex = u16;
export type Slot = u32;
export type ServiceId = u32;
export type WorkPayload = BytesBlob;
export type AuthOutput = BytesBlob;
export type WorkOutput = BytesBlob;
