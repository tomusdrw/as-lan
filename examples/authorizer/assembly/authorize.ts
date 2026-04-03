import { AuthorizeContext, AuthorizeFetcher, ByteBuf, LogMsg, gas, panic, ptrAndLen } from "@fluffylabs/as-lan";

const logger: LogMsg = LogMsg.create("auth");

export function authorize(ptr: u32, len: u32): u64 {
  const ctx = AuthorizeContext.create();
  const coreIndex = ctx.parseCoreIndex(ptr, len);
  const fetcher = AuthorizeFetcher.create();

  const authInfo = fetcher.authorizer();
  const token = fetcher.authorizationToken();

  logger
    .str("Null Authorizer, [")
    .u32(u32(coreIndex))
    .str("], ")
    .u64(u64(gas()))
    .str(" gas, ")
    .blob(authInfo.config)
    .str(" param, ")
    .blob(token)
    .str(" token")
    .info();

  const param = authInfo.config;

  if (!token.isEqualTo(param)) {
    panic("Authorization failed");
  }

  const trace = ByteBuf.create(7 + token.raw.length)
    .str("Auth=<")
    .bytes(token.raw)
    .str(">")
    .finish();
  return ptrAndLen(trace);
}
