import { AuthorizeContext, AuthorizeFetcher, ByteBuf, gas, LogMsg, panic, ptrAndLen } from "@fluffylabs/as-lan";

const logger: LogMsg = LogMsg.create("auth");

export function is_authorized(ptr: u32, len: u32): u64 {
  const ctx = AuthorizeContext.create();
  const coreIndex = ctx.parseCoreIndex(ptr, len);
  const fetcher = AuthorizeFetcher.create();

  const authConfig = fetcher.authConfig();
  const token = fetcher.authToken();

  logger
    .str("Null Authorizer, [")
    .u32(u32(coreIndex))
    .str("], ")
    .u64(u64(gas()))
    .str(" gas, ")
    .blob(authConfig)
    .str(" param, ")
    .blob(token)
    .str(" token")
    .info();

  if (!token.isEqualTo(authConfig)) {
    panic("Authorization failed");
  }

  const trace = ByteBuf.create(7 + token.length)
    .str("Auth=<")
    .bytes(token.raw)
    .str(">")
    .finish();
  return ptrAndLen(trace);
}
