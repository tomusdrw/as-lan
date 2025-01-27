import * as bytes from "./core/bytes.test";
import * as codec from "./core/codec.test";
import * as types from "./jam/types.test";

import { Test } from "./test";

export function runAllTests(): void {
  let a: u64 = 0;
  a += run(bytes.TESTS, "bytes.ts");
  a += run(codec.TESTS, "codec.ts");
  a += run(types.TESTS, "types.ts");

  const okay = u32(a >> 32);
  const total = u32(a);

  printSummary("\n\nTotal", okay, total);
  if (okay !== total) {
    throw new Error("Some tests failed.");
  }
}

function run(tests: Test[], file: string): u64 {
  let ok = 0;
  console.log(`> ${file}`);
  for (let i = 0; i < tests.length; i++) {
    console.log(`  >>> ${tests[i].name}`);
    const res = tests[i].ptr();
    if (res.isOkay) {
      console.log(`  <<< ${tests[i].name} ✅`);
      ok += 1;
    } else {
      for (let i = 0; i < res.errors.length; i++) {
        console.log(`    ${res.errors[i]}`);
      }
      console.log(`  <<< ${tests[i].name} 🔴`);
    }
  }

  printSummary(`< ${file}`, ok, tests.length);

  return (u64(ok) << 32) + tests.length;
}

function printSummary(msg: string, okay: u32, total: u32): void {
  const ico = okay === total ? "✅" : "🔴";
  console.log(`${msg} ${okay} / ${total} ${ico}`);
}
