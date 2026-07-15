/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
export interface RejectedPromise<TValue> extends Promise<TValue> {
    status: "rejected";
    reason: unknown;
}
//# sourceMappingURL=RejectedPromise.d.cts.map
