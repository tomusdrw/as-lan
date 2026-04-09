/** Exit reason from invoking an inner PVM machine. */
export enum ExitReason {
  Halt = 0,
  Panic = 1,
  Fault = 2,
  Host = 3,
  Oog = 4,
}

/** Page access permission for inner machine memory. */
export enum PageAccess {
  Inaccessible = 0,
  Read = 1,
  ReadWrite = 2,
}

/** Error: machine creation failed due to invalid entrypoint. */
export enum InvalidEntryPoint {
  InvalidEntryPoint = 0,
}

/** Error: peek/poke address out of bounds. */
export enum OutOfBounds {
  OutOfBounds = 0,
}
