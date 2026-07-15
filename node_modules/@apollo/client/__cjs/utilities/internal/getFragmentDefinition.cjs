"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFragmentDefinition = getFragmentDefinition;
const invariant_1 = require("@apollo/client/utilities/invariant");
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
function getFragmentDefinition(doc) {
    (0, invariant_1.invariant)(doc.kind === "Document", 6);
    (0, invariant_1.invariant)(doc.definitions.length <= 1, 7);
    const fragmentDef = doc.definitions[0];
    (0, invariant_1.invariant)(fragmentDef.kind === "FragmentDefinition", 8);
    return fragmentDef;
}
//# sourceMappingURL=getFragmentDefinition.cjs.map
