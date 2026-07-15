import { createFragmentMap, getFragmentDefinitions, getOperationDefinition, } from "@apollo/client/utilities/internal";
import { invariant } from "@apollo/client/utilities/invariant";
import { maskDefinition } from "./maskDefinition.js";
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
export function maskOperation(data, document, cache) {
    const definition = getOperationDefinition(document);
    invariant(definition, 43);
    if (data == null) {
        // Maintain the original `null` or `undefined` value
        return data;
    }
    return maskDefinition(data, definition.selectionSet, {
        operationType: definition.operation,
        operationName: definition.name?.value,
        fragmentMap: createFragmentMap(getFragmentDefinitions(document)),
        cache,
        mutableTargets: new WeakMap(),
        knownChanged: new WeakSet(),
    });
}
//# sourceMappingURL=maskOperation.js.map
