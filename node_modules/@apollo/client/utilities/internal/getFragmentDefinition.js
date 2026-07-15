import { invariant } from "@apollo/client/utilities/invariant";
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
export function getFragmentDefinition(doc) {
    invariant(doc.kind === "Document", 6);
    invariant(doc.definitions.length <= 1, 7);
    const fragmentDef = doc.definitions[0];
    invariant(fragmentDef.kind === "FragmentDefinition", 8);
    return fragmentDef;
}
//# sourceMappingURL=getFragmentDefinition.js.map
