import { __DEV__ } from "@apollo/client/utilities/environment";
import { deepFreeze } from "./deepFreeze.js";
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
export function maybeDeepFreeze(obj) {
    if (__DEV__) {
        deepFreeze(obj);
    }
    return obj;
}
//# sourceMappingURL=maybeDeepFreeze.js.map
