import { __DEV__ } from "@apollo/client/utilities/environment";
import { isNonNullObject } from "./isNonNullObject.js";
/**
* @internal only to be imported in tests
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
export function deepFreeze(value) {
    const workSet = new Set([value]);
    workSet.forEach((obj) => {
        if (isNonNullObject(obj) && shallowFreeze(obj) === obj) {
            Object.getOwnPropertyNames(obj).forEach((name) => {
                if (isNonNullObject(obj[name]))
                    workSet.add(obj[name]);
            });
        }
    });
    return value;
}
function shallowFreeze(obj) {
    if (__DEV__ && !Object.isFrozen(obj)) {
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
//# sourceMappingURL=deepFreeze.js.map
