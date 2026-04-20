import { AccumulateContext, Bytes32, BytesBlob, Decoder, Encoder, WorkExecResultKind } from "@fluffylabs/as-lan";
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

// Admin side-effect calls intentionally ignore their return values: in
// accumulate there is no caller to surface errors to, and every failure mode
// (WriteError.Full, SolicitError.Full/Huh, ForgetError.Huh, ProvideError.Huh/Who)
// is either transient or operator-misconfiguration — both of which are better
// diagnosed from host logs than encoded into the service response.
function dispatch(ctx: AccumulateContext, cmd: AdminCommand): void {
  if (cmd.kind === AdminCommandKind.SetMapping) {
    const entryEnc = Encoder.create();
    LibraryEntryCodec.create().encode(LibraryEntry.create(cmd.hash!, cmd.length), entryEnc);
    ctx.serviceData().write(libraryKeyFromBlob(cmd.name!), entryEnc.finish());
  } else if (cmd.kind === AdminCommandKind.RemoveMapping) {
    ctx.serviceData().write(libraryKeyFromBlob(cmd.name!), BytesBlob.empty());
  } else if (cmd.kind === AdminCommandKind.Solicit) {
    ctx.preimages().solicit(cmd.hash!, cmd.length);
  } else if (cmd.kind === AdminCommandKind.Forget) {
    ctx.preimages().forget(cmd.hash!, cmd.length);
  } else if (cmd.kind === AdminCommandKind.Provide) {
    ctx.preimages().provide(cmd.preimage!);
  }
}
