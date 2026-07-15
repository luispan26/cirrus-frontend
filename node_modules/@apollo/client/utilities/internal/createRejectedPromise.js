/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
export function createRejectedPromise(reason) {
    const promise = Promise.reject(reason);
    // prevent potential edge cases leaking unhandled error rejections
    promise.catch(() => { });
    promise.status = "rejected";
    promise.reason = reason;
    return promise;
}
//# sourceMappingURL=createRejectedPromise.js.map
