#!/usr/bin/env node

import { refine_ext } from "../build/release.js";
import { buildEmptyPackageInfo, bytesToHex, concatBytes, encodeBlob, encodeLen, leU32 } from "./example-utils.js";

const serviceId = 42;
const payload = new TextEncoder().encode("hello-jam");

const input = concatBytes(
  leU32(serviceId),
  encodeBlob(payload),
  buildEmptyPackageInfo(),
  encodeLen(0), // extrinsics vec len
);

const output = refine_ext(input);

console.log("refine example");
console.log("serviceId:", serviceId);
console.log("payload(utf8):", new TextDecoder().decode(payload));
console.log("input(hex):", bytesToHex(input));
console.log("output(hex):", bytesToHex(output));
console.log("output(utf8):", new TextDecoder().decode(output));
