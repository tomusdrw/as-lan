import { BytesBlob } from "../core/bytes";
import { readFromMemory } from "../core/mem";

export class Test {
  constructor(
    public name: string,
    public ptr: () => Assert,
  ) {}
}

export class Assert {
  public isOkay: boolean = true;
  public errors: string[] = [];

  static todo(): Assert {
    const r = new Assert();
    r.fail("Not implemented yet!");
    return r;
  }

  fail(msg: string): void {
    this.isOkay = false;
    this.errors.push(msg);
  }

  isEqualBytes(actual: BytesBlob, expected: BytesBlob, msg: string = ""): void {
    this.isEqual(actual.toString(), expected.toString(), msg);
  }

  isEqual<T>(actual: T, expected: T, msg: string = ""): void {
    if (actual !== expected) {
      this.isOkay = false;
      const actualDisplay = isInteger(actual) ? `${actual} (0x${actual.toString(16)})` : `${actual}`;
      const expectDisplay = isInteger(expected) ? `${expected} (0x${expected.toString(16)})` : `${expected}`;
      this.errors.push(`Got: ${actualDisplay}, expected: ${expectDisplay} @ ${msg}`);
    }
  }
}

export function test(name: string, ptr: () => Assert): Test {
  return new Test(name, ptr);
}

/** Wrap a string as a BytesBlob (via UTF-8 encoding). */
export function strBlob(s: string): BytesBlob {
  const buf = String.UTF8.encode(s);
  return BytesBlob.wrap(Uint8Array.wrap(buf));
}

/**
 * Unpack a ptrAndLen-packed u64 result and read the bytes from WASM memory.
 * The packing is (len << 32) | ptr.
 */
export function unpackResult(result: u64): Uint8Array {
  const len = u32(result >> 32);
  const ptr = u32(result & 0xffffffff);
  return readFromMemory(ptr, len);
}

export class TestSuite {
  constructor(
    public tests: Test[],
    public name: string,
  ) {}
}

/** Run all test suites, print results, and throw on failure. */
export function runTestSuites(suites: TestSuite[]): void {
  let a: u64 = 0;
  for (let s = 0; s < suites.length; s++) {
    a += runSuite(suites[s].tests, suites[s].name);
  }

  const okay = u32(a >> 32);
  const total = u32(a);

  printSummary("\n\nTotal", okay, total);
  if (okay !== total) {
    throw new Error("Some tests failed.");
  }
}

function runSuite(tests: Test[], file: string): u64 {
  let ok: u32 = 0;
  console.log(`> ${file}`);
  for (let i = 0; i < tests.length; i++) {
    console.log(`  >>> ${tests[i].name}`);
    const res = tests[i].ptr();
    if (res.isOkay) {
      console.log(`  <<< ${tests[i].name} ✅`);
      ok += 1;
    } else {
      for (let j = 0; j < res.errors.length; j++) {
        console.log(`    ${res.errors[j]}`);
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
