/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
export function getFragmentDefinitions(doc) {
    return doc.definitions.filter((definition) => definition.kind === "FragmentDefinition");
}
//# sourceMappingURL=getFragmentDefinitions.js.map
