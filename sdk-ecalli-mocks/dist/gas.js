const DEFAULT_GAS = 1000000n;
let gasValue = DEFAULT_GAS;
export function setGasValue(value) {
    gasValue = value;
}
export function gas() {
    return gasValue;
}
export function resetGas() {
    gasValue = DEFAULT_GAS;
}
