"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFragmentMap = createFragmentMap;
/**
* Utility function that takes a list of fragment definitions and makes a hash out of them
* that maps the name of the fragment to the fragment definition.
*
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
function createFragmentMap(fragments = []) {
    const symTable = {};
    fragments.forEach((fragment) => {
        symTable[fragment.name.value] = fragment;
    });
    return symTable;
}
//# sourceMappingURL=createFragmentMap.cjs.map
