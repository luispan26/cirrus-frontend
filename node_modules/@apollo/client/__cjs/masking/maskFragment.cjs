"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.maskFragment = maskFragment;
const equality_1 = require("@wry/equality");
const graphql_1 = require("graphql");
const internal_1 = require("@apollo/client/utilities/internal");
const invariant_1 = require("@apollo/client/utilities/invariant");
const maskDefinition_js_1 = require("./maskDefinition.cjs");
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
function maskFragment(data, document, cache, fragmentName) {
    const fragments = document.definitions.filter((node) => node.kind === graphql_1.Kind.FRAGMENT_DEFINITION);
    if (typeof fragmentName === "undefined") {
        (0, invariant_1.invariant)(fragments.length === 1, 41, fragments.length);
        fragmentName = fragments[0].name.value;
    }
    const fragment = fragments.find((fragment) => fragment.name.value === fragmentName);
    (0, invariant_1.invariant)(!!fragment, 42, fragmentName);
    if (data == null) {
        // Maintain the original `null` or `undefined` value
        return data;
    }
    if ((0, equality_1.equal)(data, {})) {
        // Return early and skip the masking algorithm if we don't have any data
        // yet. This can happen when cache.diff returns an empty object which is
        // used from watchFragment.
        return data;
    }
    return (0, maskDefinition_js_1.maskDefinition)(data, fragment.selectionSet, {
        operationType: "fragment",
        operationName: fragment.name.value,
        fragmentMap: (0, internal_1.createFragmentMap)((0, internal_1.getFragmentDefinitions)(document)),
        cache,
        mutableTargets: new WeakMap(),
        knownChanged: new WeakSet(),
    });
}
//# sourceMappingURL=maskFragment.cjs.map
