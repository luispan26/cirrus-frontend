"use strict";;
const {
    __DEV__
} = require("@apollo/client/utilities/environment");

Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSuspenseHookOptions = validateSuspenseHookOptions;
const invariant_1 = require("@apollo/client/utilities/invariant");
function validateSuspenseHookOptions(options) {
    const { fetchPolicy, returnPartialData } = options;
    validateFetchPolicy(fetchPolicy);
    validatePartialDataReturn(fetchPolicy, returnPartialData);
}
function validateFetchPolicy(fetchPolicy = "cache-first") {
    const supportedFetchPolicies = [
        "cache-first",
        "network-only",
        "no-cache",
        "cache-and-network",
    ];
    (0, invariant_1.invariant)(supportedFetchPolicies.includes(fetchPolicy), 35, fetchPolicy);
}
function validatePartialDataReturn(fetchPolicy, returnPartialData) {
    if (fetchPolicy === "no-cache" && returnPartialData) {
        __DEV__ && invariant_1.invariant.warn(36);
    }
}
//# sourceMappingURL=validateSuspenseHookOptions.cjs.map
