"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloneDeep = cloneDeep;
const { toString } = Object.prototype;
/**
* Deeply clones a value to create a new instance.
*
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
function cloneDeep(value) {
    return __cloneDeep(value);
}
function __cloneDeep(val, seen) {
    switch (toString.call(val)) {
        case "[object Array]": {
            seen = seen || new Map();
            if (seen.has(val))
                return seen.get(val);
            const copy = val.slice(0);
            seen.set(val, copy);
            copy.forEach(function (child, i) {
                copy[i] = __cloneDeep(child, seen);
            });
            return copy;
        }
        case "[object Object]": {
            seen = seen || new Map();
            if (seen.has(val))
                return seen.get(val);
            // High fidelity polyfills of Object.create and Object.getPrototypeOf are
            // possible in all JS environments, so we will assume they exist/work.
            const copy = Object.create(Object.getPrototypeOf(val));
            seen.set(val, copy);
            Object.keys(val).forEach((key) => {
                copy[key] = __cloneDeep(val[key], seen);
            });
            return copy;
        }
        default:
            return val;
    }
}
//# sourceMappingURL=cloneDeep.cjs.map
