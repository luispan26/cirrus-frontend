function isDecoratedPromise(promise) {
    return "status" in promise;
}
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
export function decoratePromise(promise) {
    if (isDecoratedPromise(promise)) {
        return promise;
    }
    const pendingPromise = promise;
    pendingPromise.status = "pending";
    pendingPromise.then((value) => {
        if (pendingPromise.status === "pending") {
            const fulfilledPromise = pendingPromise;
            fulfilledPromise.status = "fulfilled";
            fulfilledPromise.value = value;
        }
    }, (reason) => {
        if (pendingPromise.status === "pending") {
            const rejectedPromise = pendingPromise;
            rejectedPromise.status = "rejected";
            rejectedPromise.reason = reason;
        }
    });
    return promise;
}
//# sourceMappingURL=decoratePromise.js.map
