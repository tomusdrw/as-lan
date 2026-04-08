// Accumulate ecalli mock stubs (14-26).

export { bless, assign, designate } from "./privileged.js";
export { checkpoint } from "./checkpoint.js";
export { new_service, upgrade, eject, resetServices } from "./services.js";
export { transfer } from "./transfer.js";
export {
  query, solicit, forget, yield_result, provide,
  setQueryResult, setSolicitResult, setForgetResult, setProvideResult, resetPreimages,
} from "./preimages.js";

import { resetServices } from "./services.js";
import { resetPreimages } from "./preimages.js";

export function resetAccumulate(): void {
  resetServices();
  resetPreimages();
}
