import {
  AccumulateContext,
  Bytes32,
  Decoder,
  Encoder,
  WorkExecResultKind,
} from "@fluffylabs/as-lan";
import { AdminCommand, AdminCommandCodec, AdminCommandKind } from "./admin";
import { LibraryEntry, LibraryEntryCodec, libraryKeyFromBlob } from "./storage";

export function accumulate(ptr: u32, len: u32): u64 {
  const ctx = AccumulateContext.create();
  const args = ctx.parseArgs(ptr, len);
  const fetcher = ctx.fetcher();
  const adminCodec = AdminCommandCodec.create();

  for (let i: u32 = 0; i < args.argsLength; i++) {
    const itemOpt = fetcher.oneTransferOrOperand(i);
    if (!itemOpt.isSome) continue;
    const item = itemOpt.val!;
    if (!item.isOperand) continue;
    const op = item.operand;
    if (op.result.kind !== WorkExecResultKind.Ok) continue;
    const body = op.result.okBlob;

    const r = adminCodec.decode(Decoder.fromBlob(body.raw));
    if (r.isError) continue; // defensive — refine already validates

    dispatch(ctx, r.okay!);
  }

  return ctx.yieldHash(Bytes32.zero());
}

function dispatch(ctx: AccumulateContext, cmd: AdminCommand): void {
  if (cmd.kind === AdminCommandKind.SetMapping) {
    const entryEnc = Encoder.create();
    LibraryEntryCodec.create().encode(LibraryEntry.create(cmd.hash!, cmd.length), entryEnc);
    ctx.serviceData().write(libraryKeyFromBlob(cmd.name!), entryEnc.finishRaw());
  }
}
