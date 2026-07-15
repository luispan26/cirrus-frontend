/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
export function toQueryResult(value) {
    const result = {
        data: value.data,
    };
    if (value.error) {
        result.error = value.error;
    }
    return result;
}
//# sourceMappingURL=toQueryResult.js.map
