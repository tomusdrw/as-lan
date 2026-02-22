#!/usr/bin/env node

import { accumulate_ext } from "../build/release.js";
import { bytesToHex, concatBytes, encodeBlob, encodeLen, hexToBytes, leU32 } from "./example-utils.js";

const slot = 7;
const serviceId = 9;
const workPackage = hexToBytes("0x1111111111111111111111111111111111111111111111111111111111111111");
const payloadHash = hexToBytes("0x2222222222222222222222222222222222222222222222222222222222222222");
const okBlob = hexToBytes("0xab");

const resultItem = concatBytes(
  workPackage,
  encodeBlob(new Uint8Array(0)), // authOutput
  payloadHash,
  new Uint8Array([0]), // WorkExecResultKind::OK
  encodeBlob(okBlob),
);

const input = concatBytes(
  leU32(slot),
  leU32(serviceId),
  encodeLen(1), // results vec len
  resultItem,
);

const output = accumulate_ext(input);
const isSome = output.length === 33 && output[0] === 1;
const maybeHash = isSome ? output.subarray(1) : null;

console.log("accumulate example");
console.log("slot:", slot);
console.log("serviceId:", serviceId);
console.log("input(hex):", bytesToHex(input));
console.log("output(hex):", bytesToHex(output));
console.log("decoded option tag:", output[0] ?? 0);
console.log("decoded hash:", maybeHash ? bytesToHex(maybeHash) : "None");
