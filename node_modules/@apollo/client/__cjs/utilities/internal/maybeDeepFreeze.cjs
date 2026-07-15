"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.maybeDeepFreeze = maybeDeepFreeze;
const environment_1 = require("@apollo/client/utilities/environment");
const deepFreeze_js_1 = require("./deepFreeze.cjs");
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
function maybeDeepFreeze(obj) {
    if (environment_1.__DEV__) {
        (0, deepFreeze_js_1.deepFreeze)(obj);
    }
    return obj;
}
//# sourceMappingURL=maybeDeepFreeze.cjs.map
