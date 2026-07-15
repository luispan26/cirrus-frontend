/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
export function getOperationName(doc, fallback) {
    return (doc.definitions.find((definition) => definition.kind === "OperationDefinition" && !!definition.name)?.name.value ?? fallback);
}
//# sourceMappingURL=getOperationName.js.map
