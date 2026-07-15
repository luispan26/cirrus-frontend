"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getQueryDefinition = getQueryDefinition;
const invariant_1 = require("@apollo/client/utilities/invariant");
const getOperationDefinition_js_1 = require("./getOperationDefinition.cjs");
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
function getQueryDefinition(doc) {
    const queryDef = (0, getOperationDefinition_js_1.getOperationDefinition)(doc);
    (0, invariant_1.invariant)(queryDef && queryDef.operation === "query", 13);
    return queryDef;
}
//# sourceMappingURL=getQueryDefinition.cjs.map
