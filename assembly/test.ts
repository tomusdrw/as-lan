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
