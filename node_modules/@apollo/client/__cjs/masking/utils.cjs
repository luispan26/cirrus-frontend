"use strict";;
const {
    __DEV__
} = require("@apollo/client/utilities/environment");

Object.defineProperty(exports, "__esModule", { value: true });
exports.disableWarningsSlot = void 0;
exports.getFragmentMaskMode = getFragmentMaskMode;
const graphql_1 = require("graphql");
const optimism_1 = require("optimism");
const environment_1 = require("@apollo/client/utilities/environment");
const invariant_1 = require("@apollo/client/utilities/invariant");
// Contextual slot that allows us to disable accessor warnings on fields when in
// migrate mode.
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
exports.disableWarningsSlot = new optimism_1.Slot();
function getFragmentMaskMode(fragment) {
    const directive = fragment.directives?.find(({ name }) => name.value === "unmask");
    if (!directive) {
        return "mask";
    }
    const modeArg = directive.arguments?.find(({ name }) => name.value === "mode");
    if (environment_1.__DEV__) {
        if (modeArg) {
            if (modeArg.value.kind === graphql_1.Kind.VARIABLE) {
                __DEV__ && invariant_1.invariant.warn(44);
            }
            else if (modeArg.value.kind !== graphql_1.Kind.STRING) {
                __DEV__ && invariant_1.invariant.warn(45);
            }
            else if (modeArg.value.value !== "migrate") {
                __DEV__ && invariant_1.invariant.warn(46, modeArg.value.value);
            }
        }
    }
    if (modeArg &&
        "value" in modeArg.value &&
        modeArg.value.value === "migrate") {
        return "migrate";
    }
    return "unmask";
}
//# sourceMappingURL=utils.cjs.map
