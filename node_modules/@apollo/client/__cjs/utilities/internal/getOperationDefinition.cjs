"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOperationDefinition = getOperationDefinition;
const checkDocument_js_1 = require("./checkDocument.cjs");
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
function getOperationDefinition(doc) {
    (0, checkDocument_js_1.checkDocument)(doc);
    return doc.definitions.filter((definition) => definition.kind === "OperationDefinition")[0];
}
//# sourceMappingURL=getOperationDefinition.cjs.map
