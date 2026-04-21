import { BytesBlob } from "../../core/bytes";
import { Decoder } from "../../core/codec/decode";
import { panic } from "../../core/panic";
import { ResultN } from "../../core/result";
import { ExitReason, InvokeIo, Machine, OutOfBounds } from "./machine";

/** SPI memory-layout constants (Z_P, Z_Z, Z_I). */
export const SPI_PAGE_SIZE: u32 = 1 << 12;
export const SPI_SEGMENT_SIZE: u32 = 1 << 16;
export const SPI_MAX_ARGS_LEN: u32 = 1 << 24;
export const SPI_RO_START: u32 = SPI_SEGMENT_SIZE;
export const SPI_ARGS_SEGMENT_START: u32 = 0xFFFF_FFFF - SPI_SEGMENT_SIZE - SPI_MAX_ARGS_LEN + 1; // 0xFEFF_0000
export const SPI_STACK_SEGMENT_END: u32 = SPI_ARGS_SEGMENT_START - SPI_SEGMENT_SIZE;             // 0xFEFE_0000
const R0_INITIAL: u64 = 0xFFFF_0000;

/** Host-call-backed inner PVM set up from an SPI blob. */
export class NestedPvm {
  static fromSpi(blob: BytesBlob, args: BytesBlob, gas: u64): NestedPvm {
    if (u32(args.length) > SPI_MAX_ARGS_LEN) panic("SPI: args exceed MAX_ARGS_LEN");

    // `Decoder.fromBlob` takes a raw `Uint8Array`; `.raw` is the backing buffer.
    const d = Decoder.fromBlob(blob.raw);
    const roLength = d.u24();
    const rwLength = d.u24();
    const heapPages = u32(d.u16());
    const stackSize = d.u24();
    const roBytes = d.bytesFixLen(roLength);
    const rwBytes = d.bytesFixLen(rwLength);
    const codeLength = d.u32();
    const codeBytes = d.bytesFixLen(codeLength);
    if (d.isError) panic("SPI: malformed blob");
    if (!d.isFinished()) panic("SPI: trailing bytes");

    const machineResult = Machine.create(codeBytes, 0);
    if (machineResult.isError) panic("SPI: invalid entry point");
    const machine = machineResult.okay!;

    const io = InvokeIo.create(gas);
    io.setRegister(0, R0_INITIAL);
    io.setRegister(1, u64(SPI_STACK_SEGMENT_END));
    io.setRegister(7, u64(SPI_ARGS_SEGMENT_START));
    io.setRegister(8, u64(u32(args.length)));

    // Memory setup (pages/poke) is filled in by Task 4.
    // For now we intentionally skip those calls so this task can land green
    // without disturbing later work.

    return new NestedPvm(machine, io, roBytes, rwBytes, heapPages, stackSize, args);
  }

  private lastExitArg: i64 = 0;

  private constructor(
    private readonly machine: Machine,
    private readonly io: InvokeIo,
    // Retained only for Task 4 (memory setup); will be consumed there.
    private readonly roBytes: BytesBlob,
    private readonly rwBytes: BytesBlob,
    private readonly heapPages: u32,
    private readonly stackSize: u32,
    private readonly args: BytesBlob,
  ) {}

  getRegister(index: u32): u64 {
    return this.io.getRegister(index);
  }

  setRegister(index: u32, value: u64): void {
    this.io.setRegister(index, value);
  }

  remainingGas(): u64 {
    return this.io.gas;
  }

  setGas(gas: u64): void {
    this.io.gas = gas;
  }

  getExitArg(): i64 {
    return this.lastExitArg;
  }

  invoke(): ExitReason {
    const outcome = this.machine.invoke(this.io);
    this.lastExitArg = outcome.r8;
    return outcome.reason;
  }

  peek(source: u32, dest: BytesBlob): ResultN<bool, OutOfBounds> {
    return this.machine.peek(source, dest);
  }

  poke(dest: u32, data: BytesBlob): ResultN<bool, OutOfBounds> {
    return this.machine.poke(dest, data);
  }

  expunge(): i64 {
    return this.machine.expunge();
  }
}
