"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deepFreeze = deepFreeze;
const environment_1 = require("@apollo/client/utilities/environment");
const isNonNullObject_js_1 = require("./isNonNullObject.cjs");
/**
* @internal only to be imported in tests
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
function deepFreeze(value) {
    const workSet = new Set([value]);
    workSet.forEach((obj) => {
        if ((0, isNonNullObject_js_1.isNonNullObject)(obj) && shallowFreeze(obj) === obj) {
            Object.getOwnPropertyNames(obj).forEach((name) => {
                if ((0, isNonNullObject_js_1.isNonNullObject)(obj[name]))
                    workSet.add(obj[name]);
            });
        }
    });
    return value;
}
function shallowFreeze(obj) {
    if (environment_1.__DEV__ && !Object.isFrozen(obj)) {
        try {
            Object.freeze(obj);
        }
        catch (e) {
            // Some types like Uint8Array and Node.js's Buffer cannot be frozen, but
            // they all throw a TypeError when you try, so we re-throw any exceptions
            // that are not TypeErrors, since that would be unexpected.
            if (e instanceof TypeError)
                return null;
            throw e;
        }
    }
    return obj;
}
//# sourceMappingURL=deepFreeze.cjs.map
