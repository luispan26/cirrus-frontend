import { checkDocument } from "./checkDocument.js";
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
export function getOperationDefinition(doc) {
    checkDocument(doc);
    return doc.definitions.filter((definition) => definition.kind === "OperationDefinition")[0];
}
//# sourceMappingURL=getOperationDefinition.js.map
