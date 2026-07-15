"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.graphQLResultHasError = graphQLResultHasError;
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
function graphQLResultHasError(result) {
    return !!result.errors?.length;
}
//# sourceMappingURL=graphQLResultHasError.cjs.map
