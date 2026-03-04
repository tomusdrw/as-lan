import { log } from "./imports";

// Log levels matching JIP-1 specification
export const enum LogLevel {
  Fatal = 0,
  Warning = 1,
  Important = 2,
  Helpful = 3,
  Pedantic = 4,
}

// Set to false to disable all logging at compile time.
// When false, the compiler will eliminate all log calls as dead code.
const LOGGING_ENABLED = true;

export class Logger {
  private target: string;

  constructor(target: string) {
    this.target = target;
  }

  fatal(message: string): void {
    this.log(LogLevel.Fatal, message);
  }

  warn(message: string): void {
    this.log(LogLevel.Warning, message);
  }

  info(message: string): void {
    this.log(LogLevel.Important, message);
  }

  debug(message: string): void {
    this.log(LogLevel.Helpful, message);
  }

  trace(message: string): void {
    this.log(LogLevel.Pedantic, message);
  }

  private log(level: LogLevel, message: string): void {
    if (!LOGGING_ENABLED) {
      return;
    }

    const targetBuf = String.UTF8.encode(this.target);
    const msgBuf = String.UTF8.encode(message);

    log(
      level,
      changetype<u32>(targetBuf),
      targetBuf.byteLength,
      changetype<u32>(msgBuf),
      msgBuf.byteLength,
    );
  }
}
