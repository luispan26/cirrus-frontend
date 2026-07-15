/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
export type RemoveIndexSignature<T> = {
    [K in keyof T as string extends K ? never : number extends K ? never : symbol extends K ? never : K]: T[K];
};
//# sourceMappingURL=RemoveIndexSignature.d.ts.map
