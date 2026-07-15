"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.omitDeep = omitDeep;
const isPlainObject_js_1 = require("./isPlainObject.cjs");
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
function omitDeep(value, key) {
    return __omitDeep(value, key);
}
function __omitDeep(value, key, known = new Map()) {
    if (known.has(value)) {
        return known.get(value);
    }
    let modified = false;
    if (Array.isArray(value)) {
        const array = [];
        known.set(value, array);
        value.forEach((value, index) => {
            const result = __omitDeep(value, key, known);
            modified ||= result !== value;
            array[index] = result;
        });
        if (modified) {
            return array;
        }
    }
    else if ((0, isPlainObject_js_1.isPlainObject)(value)) {
        const obj = Object.create(Object.getPrototypeOf(value));
        known.set(value, obj);
        Object.keys(value).forEach((k) => {
            if (k === key) {
                modified = true;
                return;
            }
            const result = __omitDeep(value[k], key, known);
            modified ||= result !== value[k];
            obj[k] = result;
        });
        if (modified) {
            return obj;
        }
    }
    return value;
}
//# sourceMappingURL=omitDeep.cjs.map
