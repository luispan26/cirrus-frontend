"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDocumentNode = isDocumentNode;
const isNonNullObject_js_1 = require("./isNonNullObject.cjs");
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
function isDocumentNode(value) {
    return ((0, isNonNullObject_js_1.isNonNullObject)(value) &&
        value.kind === "Document" &&
        Array.isArray(value.definitions));
}
//# sourceMappingURL=isDocumentNode.cjs.map
