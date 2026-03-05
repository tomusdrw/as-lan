import { registerService } from "as-lan-sdk";
import { accumulate, refine } from "./fibonacci";

registerService(accumulate, refine);

// Re-export the SDK's WASM entry points
export { refine_ext, accumulate_ext, is_authorized } from "as-lan-sdk";
