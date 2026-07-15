"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGraphQLErrorsFromResult = getGraphQLErrorsFromResult;
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
function getGraphQLErrorsFromResult(result) {
    return [...(result.errors || [])];
}
//# sourceMappingURL=getGraphQLErrorsFromResult.cjs.map
