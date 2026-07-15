/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
export interface FulfilledPromise<TValue> extends Promise<TValue> {
    status: "fulfilled";
    value: TValue;
}
//# sourceMappingURL=FulfilledPromise.d.ts.map
