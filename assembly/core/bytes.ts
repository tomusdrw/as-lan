export class Bytes32 {
  constructor(
    public readonly data: Uint8Array,
  ) {
    // TODO [ToDr] check data.length
  }
}

export class Blob {
  constructor(
    public readonly data: Uint8Array,
  ) {}
}
