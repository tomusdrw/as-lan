import { registerService } from "as-lan-sdk";
import { accumulate, refine } from "./fibonacci";

registerService(accumulate, refine);

// Re-export the SDK's WASM entry points and result globals
export { refine_ext, accumulate_ext, is_authorized, result_ptr, result_len } from "as-lan-sdk";
