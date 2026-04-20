// Accumulate ecalli mock stubs (14-26).

export {
  bless, assign, designate,
  setBlessResult, setAssignResult, setDesignateResult,
  getLastBlessManager, getLastBlessAssignersPtr, getLastBlessDelegator,
  getLastBlessRegistrar, getLastBlessAutoAccumPtr, getLastBlessAutoAccumCount,
  getLastAssignCore, getLastAssignAuthQueuePtr, getLastAssignNewAssigner,
  getLastDesignateValidatorsPtr,
  resetPrivileged,
} from "./privileged.js";
export { checkpoint } from "./checkpoint.js";
export {
  new_service, upgrade, eject,
  setNewServiceResult, setEjectResult,
  getLastUpgradeCodeHashPtr, getLastUpgradeGas, getLastUpgradeAllowance,
  resetServices,
} from "./services.js";
export { transfer, setTransferResult, resetTransfer } from "./transfer.js";
export {
  query, solicit, forget, yield_result, provide,
  setQueryResult, setSolicitResult, setForgetResult, setProvideResult, resetPreimages,
  getSolicitCount, getForgetCount, getProvideCount, resetPreimageCounters,
} from "./preimages.js";

import { resetPrivileged } from "./privileged.js";
import { resetServices } from "./services.js";
import { resetTransfer } from "./transfer.js";
import { resetPreimages } from "./preimages.js";

export function resetAccumulate(): void {
  resetPrivileged();
  resetServices();
  resetTransfer();
  resetPreimages();
}
