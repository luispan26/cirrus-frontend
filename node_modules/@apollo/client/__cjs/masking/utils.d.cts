import type { FragmentSpreadNode } from "graphql";
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
export declare const disableWarningsSlot: {
    readonly id: string;
    hasValue(): boolean;
    getValue(): boolean | undefined;
    withValue<TResult, TArgs extends any[], TThis = any>(value: boolean, callback: (this: TThis, ...args: TArgs) => TResult, args?: TArgs | undefined, thisArg?: TThis | undefined): TResult;
};
export declare function getFragmentMaskMode(fragment: FragmentSpreadNode): "mask" | "migrate" | "unmask";
//# sourceMappingURL=utils.d.cts.map
