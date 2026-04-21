import { BytesBlob } from "../../core/bytes";
import { Decoder } from "../../core/codec/decode";
import { panic } from "../../core/panic";
import { ResultN } from "../../core/result";
import { ExitReason, InvokeIo, Machine, OutOfBounds, PageAccess } from "./machine";

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

    setupRegion(machine, SPI_RO_START, roBytes, PageAccess.Read);

    const heapStart = 2 * SPI_SEGMENT_SIZE + alignToSegment(roLength);
    setupRegion(machine, heapStart, rwBytes, PageAccess.ReadWrite);

    const heapZerosStart = heapStart + alignToPage(rwLength);
    const heapZerosBytes = heapPages * SPI_PAGE_SIZE;
    if (heapZerosBytes > 0) {
      allocatePages(machine, heapZerosStart, heapZerosBytes, PageAccess.ReadWrite);
    }

    const stackLength = alignToPage(stackSize);
    if (stackLength > 0) {
      const stackStart = SPI_STACK_SEGMENT_END - stackLength;
      allocatePages(machine, stackStart, stackLength, PageAccess.ReadWrite);
    }

    if (args.length > 0) {
      setupRegion(machine, SPI_ARGS_SEGMENT_START, args, PageAccess.Read);
    }

    return new NestedPvm(machine, io);
  }

  private lastExitArg: i64 = 0;

  private constructor(
    private readonly machine: Machine,
    private readonly io: InvokeIo,
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

function alignToPage(size: u32): u32 {
  const mask: u32 = SPI_PAGE_SIZE - 1;
  return (size + mask) & ~mask;
}

function alignToSegment(size: u32): u32 {
  const mask: u32 = SPI_SEGMENT_SIZE - 1;
  return (size + mask) & ~mask;
}

/** Allocate pages covering [addr, addr + byteLen) with the given access. */
function allocatePages(machine: Machine, addr: u32, byteLen: u32, access: PageAccess): void {
  // addr is always page-aligned by construction (RO/RW/heap/stack/args start on page boundaries).
  const startPage = addr / SPI_PAGE_SIZE;
  const pageCount = alignToPage(byteLen) / SPI_PAGE_SIZE;
  machine.pages(startPage, pageCount, access);
}

/** Allocate a region at `addr`, then poke the initial bytes. */
function setupRegion(machine: Machine, addr: u32, data: BytesBlob, access: PageAccess): void {
  if (data.length === 0) return;
  allocatePages(machine, addr, u32(data.length), access);
  machine.poke(addr, data);
}
