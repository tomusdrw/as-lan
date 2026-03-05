import { registerService } from "@fluffylabs/as-lan";
import { accumulate, refine } from "./fibonacci";

registerService(refine, accumulate);

// Re-export the SDK's WASM entry points and result globals
export { refine_ext, accumulate_ext, is_authorized_ext, result_ptr, result_len } from "@fluffylabs/as-lan";
