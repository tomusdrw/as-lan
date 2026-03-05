import { log } from "./ecalli";

/** Log levels matching JIP-1 specification */
export enum LogLevel {
  Fatal = 0,
  Warning = 1,
  Important = 2,
  Helpful = 3,
  Pedantic = 4,
}

// @ts-ignore: ASC_OPTIMIZE_LEVEL is an AssemblyScript compile-time constant
const DEBUG_LOGGING: bool = ASC_OPTIMIZE_LEVEL < 3;

export class Logger {
  private readonly target: string;

  constructor(target: string) {
    this.target = target;
  }

  fatal(message: string): void {
    this._log(LogLevel.Fatal, message);
  }

  warn(message: string): void {
    this._log(LogLevel.Warning, message);
  }

  info(message: string): void {
    this._log(LogLevel.Important, message);
  }

  debug(message: string): void {
    if (DEBUG_LOGGING) {
      this._log(LogLevel.Helpful, message);
    }
  }

  trace(message: string): void {
    if (DEBUG_LOGGING) {
      this._log(LogLevel.Pedantic, message);
    }
  }

  private _log(level: LogLevel, message: string): void {
    const targetBuf = String.UTF8.encode(this.target);
    const msgBuf = String.UTF8.encode(message);
    log(level, changetype<u32>(targetBuf), targetBuf.byteLength, changetype<u32>(msgBuf), msgBuf.byteLength);
  }
}
