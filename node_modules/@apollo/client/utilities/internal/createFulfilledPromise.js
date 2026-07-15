/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
export function createFulfilledPromise(value) {
    const promise = Promise.resolve(value);
    promise.status = "fulfilled";
    promise.value = value;
    return promise;
}
//# sourceMappingURL=createFulfilledPromise.js.map
