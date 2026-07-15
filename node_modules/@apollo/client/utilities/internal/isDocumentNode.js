import { isNonNullObject } from "./isNonNullObject.js";
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
export function isDocumentNode(value) {
    return (isNonNullObject(value) &&
        value.kind === "Document" &&
        Array.isArray(value.definitions));
}
//# sourceMappingURL=isDocumentNode.js.map
