// Ecalli 17: Checkpoint — delegates to gas mock.
import { gas } from "../general/gas.js";
/** Ecalli 17: Checkpoint — commit state and return remaining gas. */
export function checkpoint() {
    return gas();
}
