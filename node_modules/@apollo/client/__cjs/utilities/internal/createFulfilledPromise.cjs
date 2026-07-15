"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFulfilledPromise = createFulfilledPromise;
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
function createFulfilledPromise(value) {
    const promise = Promise.resolve(value);
    promise.status = "fulfilled";
    promise.value = value;
    return promise;
}
//# sourceMappingURL=createFulfilledPromise.cjs.map
