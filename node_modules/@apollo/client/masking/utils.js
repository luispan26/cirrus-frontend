import { Kind } from "graphql";
import { Slot } from "optimism";
import { __DEV__ } from "@apollo/client/utilities/environment";
import { invariant } from "@apollo/client/utilities/invariant";
// Contextual slot that allows us to disable accessor warnings on fields when in
// migrate mode.
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
export const disableWarningsSlot = new Slot();
export function getFragmentMaskMode(fragment) {
    const directive = fragment.directives?.find(({ name }) => name.value === "unmask");
    if (!directive) {
        return "mask";
    }
    const modeArg = directive.arguments?.find(({ name }) => name.value === "mode");
    if (__DEV__) {
        if (modeArg) {
            if (modeArg.value.kind === Kind.VARIABLE) {
                __DEV__ && invariant.warn(44);
            }
            else if (modeArg.value.kind !== Kind.STRING) {
                __DEV__ && invariant.warn(45);
            }
            else if (modeArg.value.value !== "migrate") {
                __DEV__ && invariant.warn(46, modeArg.value.value);
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
//# sourceMappingURL=utils.js.map
