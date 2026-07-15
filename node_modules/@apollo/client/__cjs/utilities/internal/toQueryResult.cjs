"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toQueryResult = toQueryResult;
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
function toQueryResult(value) {
    const result = {
        data: value.data,
    };
    if (value.error) {
        result.error = value.error;
    }
    return result;
}
//# sourceMappingURL=toQueryResult.cjs.map
