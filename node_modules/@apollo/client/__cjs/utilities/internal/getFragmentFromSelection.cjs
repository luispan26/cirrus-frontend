"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFragmentFromSelection = getFragmentFromSelection;
const invariant_1 = require("@apollo/client/utilities/invariant");
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
function getFragmentFromSelection(selection, fragmentMap) {
    switch (selection.kind) {
        case "InlineFragment":
            return selection;
        case "FragmentSpread": {
            const fragmentName = selection.name.value;
            if (typeof fragmentMap === "function") {
                return fragmentMap(fragmentName);
            }
            const fragment = fragmentMap && fragmentMap[fragmentName];
            (0, invariant_1.invariant)(fragment, 9, fragmentName);
            return fragment || null;
        }
        default:
            return null;
    }
}
//# sourceMappingURL=getFragmentFromSelection.cjs.map
