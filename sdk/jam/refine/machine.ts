import { BytesBlob } from "../../core/bytes";
import { panic } from "../../core/panic";
import { ResultN } from "../../core/result";
import { EcalliResult } from "../../ecalli";
import { expunge as ecalli_expunge } from "../../ecalli/refine/expunge";
import { invoke as ecalli_invoke } from "../../ecalli/refine/invoke";
import { machine as ecalli_machine } from "../../ecalli/refine/machine";
import { pages as ecalli_pages } from "../../ecalli/refine/pages";
import { peek as ecalli_peek } from "../../ecalli/refine/peek";
import { poke as ecalli_poke } from "../../ecalli/refine/poke";

const NUM_REGISTERS: u32 = 13;
const REGISTER_SIZE: u32 = 8; // i64
const GAS_SIZE: u32 = 8; // i64
/** Total size of the invoke I/O structure: gas (8) + 13 registers (8 each) = 112 bytes. */
export const INVOKE_IO_SIZE: u32 = GAS_SIZE + NUM_REGISTERS * REGISTER_SIZE;

/**
 * Typed wrapper over the 112-byte I/O structure used by the `invoke` ecalli.
 *
 * Layout: [gas: i64, r0: i64, r1: i64, ..., r12: i64]
 *
 * The structure is read before invoke (gas limit + initial registers) and
 * written after (gas remaining + final registers). Reuse across invoke calls.
 */
export class InvokeIo {
  static create(gas: u64): InvokeIo {
    const buf = BytesBlob.zero(INVOKE_IO_SIZE);
    const io = new InvokeIo(buf);
    io.gas = gas;
    return io;
  }

  private constructor(
    readonly buf: BytesBlob,
  ) {}

  get gas(): u64 {
    return load<u64>(this.buf.raw.dataStart);
  }

  set gas(value: u64) {
    store<u64>(this.buf.raw.dataStart, value);
  }

  getRegister(index: u32): u64 {
    assert(index < NUM_REGISTERS);
    return load<u64>(this.buf.raw.dataStart + GAS_SIZE + index * REGISTER_SIZE);
  }

  setRegister(index: u32, value: u64): void {
    assert(index < NUM_REGISTERS);
    store<u64>(this.buf.raw.dataStart + GAS_SIZE + index * REGISTER_SIZE, value);
  }
}

/** Result of invoking an inner PVM machine. */
export class InvokeOutcome {
  static create(reason: ExitReason, r8: i64, io: InvokeIo): InvokeOutcome {
    return new InvokeOutcome(reason, r8, io);
  }

  private constructor(
    /** Exit reason (Halt, Panic, Fault, Host, Oog). */
    public readonly reason: ExitReason,
    /** Secondary result: host call index (if Host), fault address (if Fault). */
    public readonly r8: i64,
    /** Reference to the I/O structure — gas and registers reflect post-invoke state. */
    public readonly io: InvokeIo,
  ) {}
}

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

/**
 * High-level wrapper for inner PVM machine lifecycle (ecalli 8-13).
 *
 * Create a machine with {@link Machine.create}, use peek/poke/pages/invoke
 * to interact with it, and call expunge when done.
 */
export class Machine {
  static create(code: BytesBlob, entrypoint: u32): ResultN<Machine, InvalidEntryPoint> {
    const result = ecalli_machine(code.ptr(), code.length, entrypoint);
    if (result === EcalliResult.HUH) {
      return ResultN.err<Machine, InvalidEntryPoint>(InvalidEntryPoint.InvalidEntryPoint);
    }
    return ResultN.ok<Machine, InvalidEntryPoint>(new Machine(u32(result)));
  }

  private constructor(
    private readonly id: u32,
  ) {}

  /** Read data from inner machine memory into the provided buffer. */
  peek(source: u32, dest: BytesBlob): ResultN<bool, OutOfBounds> {
    const result = ecalli_peek(this.id, dest.ptr(), source, dest.length);
    if (result === EcalliResult.WHO) panic("peek: unknown machine ID (WHO)");
    if (result === EcalliResult.OOB) return ResultN.err<bool, OutOfBounds>(OutOfBounds.OutOfBounds);
    return ResultN.ok<bool, OutOfBounds>(true);
  }

  /** Write data into inner machine memory. */
  poke(dest: u32, data: BytesBlob): ResultN<bool, OutOfBounds> {
    const result = ecalli_poke(this.id, data.ptr(), dest, data.length);
    if (result === EcalliResult.WHO) panic("poke: unknown machine ID (WHO)");
    if (result === EcalliResult.OOB) return ResultN.err<bool, OutOfBounds>(OutOfBounds.OutOfBounds);
    return ResultN.ok<bool, OutOfBounds>(true);
  }

  /** Set page access permissions for inner machine memory. */
  pages(startPage: u32, pageCount: u32, access: PageAccess): void {
    const result = ecalli_pages(this.id, startPage, pageCount, access);
    if (result === EcalliResult.WHO) panic("pages: unknown machine ID (WHO)");
    if (result === EcalliResult.HUH) panic("pages: invalid access type (HUH)");
  }

  /**
   * Run the inner PVM machine.
   *
   * The InvokeIo structure is read before execution (gas limit + initial registers)
   * and written after (gas remaining + final registers). The same InvokeIo is
   * returned inside InvokeOutcome for convenience.
   */
  invoke(io: InvokeIo): InvokeOutcome {
    const outR8 = BytesBlob.zero(8);
    const result = ecalli_invoke(this.id, io.buf.ptr(), outR8.ptr());
    if (result === EcalliResult.WHO) panic("invoke: unknown machine ID (WHO)");
    const r8 = load<i64>(outR8.raw.dataStart);
    const reason: ExitReason = u32(result);
    return InvokeOutcome.create(reason, r8, io);
  }

  /** Destroy the inner machine and return the host result (hash). */
  expunge(): i64 {
    const result = ecalli_expunge(this.id);
    if (result === EcalliResult.WHO) panic("expunge: unknown machine ID (WHO)");
    return result;
  }
}
