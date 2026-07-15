"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOperationName = getOperationName;
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
function getOperationName(doc, fallback) {
    return (doc.definitions.find((definition) => definition.kind === "OperationDefinition" && !!definition.name)?.name.value ?? fallback);
}
//# sourceMappingURL=getOperationName.cjs.map
