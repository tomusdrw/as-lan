export class Union<A, B, C, D, E, F> {
  protected constructor(
    protected readonly tag: u32,
    protected readonly a: A | null,
    protected readonly b: B | null,
    protected readonly c: C | null,
    protected readonly d: D | null,
    protected readonly e: E | null,
    protected readonly f: F | null,
  ) {}
}

/** Optional for nullable types. */
export class Optional<T> {
 static some<T>(some: T): Optional<T> {
    return new Optional(true, some);
  }

  static none<T>(): Optional<T> {
    return new Optional(false, null);
  }

  private constructor(
    public readonly isSome: boolean,
    public readonly val: T | null,
  ) {}
}

/** Optional for non-nullable types. */
export class OptionalN<T> {
  static some<T>(some: T): OptionalN<T> {
    return new OptionalN(true, some);
  }

  static none<T>(): OptionalN<T> {
    return new OptionalN(false, changetype<T>(0));
  }

  private constructor(
    public readonly isSome: boolean,
    public readonly val: T,
  ) {}
}


/** Result for nullable types. */
export class Result<Ok, Err> {

  static ok<Ok, Err>(ok: Ok): Result<Ok, Err> {
    return new Result(true, ok, null);
  }

  static error<Ok, Err>(error: Err): Result<Ok, Err> {
    return new Result(false, null, error);
  }

  public readonly isError: boolean;

  private constructor(
    public readonly isOkay: boolean,
    public readonly ok: Ok | null,
    public readonly err: Err | null,
  ) {
    this.isError = !isOkay;
  }
}


/** 
 * Result for non-nullable types.
 *
 * Use `Optional` if you need to mix nullable and non-nullable.
 */
export class ResultN<Ok, Err> {
 static ok<Ok, Err>(ok: Ok): ResultN<Ok, Err> {
    return new ResultN(true, ok, changetype<Err>(0));
  }

  static error<Ok, Err>(error: Err): ResultN<Ok, Err> {
    return new ResultN(false, changetype<Ok>(0), error);
  }

  public readonly isError: boolean;


  private constructor(
    public readonly isOkay: boolean,
    public readonly ok: Ok,
    public readonly err: Err,
  ) {
    this.isError = !isOkay;
  }
}
