import { equal } from "@wry/equality";
import { Kind } from "graphql";
import { createFragmentMap, getFragmentDefinitions, } from "@apollo/client/utilities/internal";
import { invariant } from "@apollo/client/utilities/invariant";
import { maskDefinition } from "./maskDefinition.js";
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
export function maskFragment(data, document, cache, fragmentName) {
    const fragments = document.definitions.filter((node) => node.kind === Kind.FRAGMENT_DEFINITION);
    if (typeof fragmentName === "undefined") {
        invariant(fragments.length === 1, 41, fragments.length);
        fragmentName = fragments[0].name.value;
    }
    const fragment = fragments.find((fragment) => fragment.name.value === fragmentName);
    invariant(!!fragment, 42, fragmentName);
    if (data == null) {
        // Maintain the original `null` or `undefined` value
        return data;
    }
    if (equal(data, {})) {
        // Return early and skip the masking algorithm if we don't have any data
        // yet. This can happen when cache.diff returns an empty object which is
        // used from watchFragment.
        return data;
    }
    return maskDefinition(data, fragment.selectionSet, {
        operationType: "fragment",
        operationName: fragment.name.value,
        fragmentMap: createFragmentMap(getFragmentDefinitions(document)),
        cache,
        mutableTargets: new WeakMap(),
        knownChanged: new WeakSet(),
    });
}
//# sourceMappingURL=maskFragment.js.map
