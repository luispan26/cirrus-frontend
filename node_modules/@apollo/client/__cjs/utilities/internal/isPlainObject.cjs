"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPlainObject = isPlainObject;
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
function isPlainObject(obj) {
    return (obj !== null &&
        typeof obj === "object" &&
        (Object.getPrototypeOf(obj) === Object.prototype ||
            Object.getPrototypeOf(obj) === null));
}
//# sourceMappingURL=isPlainObject.cjs.map
