/**
* Merges the provided objects shallowly and removes
* all properties with an `undefined` value
*
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
export function compact(...objects) {
    const result = {};
    objects.forEach((obj) => {
        if (!obj)
            return;
        Reflect.ownKeys(obj).forEach((key) => {
            const value = obj[key];
            if (value !== void 0) {
                result[key] = value;
            }
        });
    });
    return result;
}
//# sourceMappingURL=compact.js.map
