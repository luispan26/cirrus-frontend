export function preventUnhandledRejection(promise) {
    promise.catch(() => { });
    return promise;
}
//# sourceMappingURL=preventUnhandledRejection.js.map