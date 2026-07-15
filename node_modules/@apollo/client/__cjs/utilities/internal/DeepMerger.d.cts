import { isNonNullObject } from "./isNonNullObject.cjs";
type ReconcilerFunction = (this: DeepMerger, target: Record<string | number, any>, source: Record<string | number, any>, property: string | number) => any;
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
export declare namespace DeepMerger {
    interface Options {
        arrayMerge?: DeepMerger.ArrayMergeStrategy;
        reconciler?: ReconcilerFunction;
    }
    interface MergeOptions {
        atPath?: ReadonlyArray<string | number>;
    }
    type ArrayMergeStrategy = "truncate" | "combine";
}
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
export declare class DeepMerger {
    private options;
    private reconciler;
    constructor(options?: DeepMerger.Options);
    merge(target: any, source: any, mergeOptions?: DeepMerger.MergeOptions): any;
    isObject: typeof isNonNullObject;
    private pastCopies;
    shallowCopyForMerge<T>(value: T): T;
}
export {};
//# sourceMappingURL=DeepMerger.d.cts.map
