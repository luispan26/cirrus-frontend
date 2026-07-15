"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.maskOperation = maskOperation;
const internal_1 = require("@apollo/client/utilities/internal");
const invariant_1 = require("@apollo/client/utilities/invariant");
const maskDefinition_js_1 = require("./maskDefinition.cjs");
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
function maskOperation(data, document, cache) {
    const definition = (0, internal_1.getOperationDefinition)(document);
    (0, invariant_1.invariant)(definition, 43);
    if (data == null) {
        // Maintain the original `null` or `undefined` value
        return data;
    }
    return (0, maskDefinition_js_1.maskDefinition)(data, definition.selectionSet, {
        operationType: definition.operation,
        operationName: definition.name?.value,
        fragmentMap: (0, internal_1.createFragmentMap)((0, internal_1.getFragmentDefinitions)(document)),
        cache,
        mutableTargets: new WeakMap(),
        knownChanged: new WeakSet(),
    });
}
//# sourceMappingURL=maskOperation.cjs.map
