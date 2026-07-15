import type { Primitive } from "./Primitive.cjs";
type DeepOmitPrimitive = Primitive | Function;
type DeepOmitArray<T extends any[], K> = {
    [P in keyof T]: DeepOmit<T[P], K>;
};
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
export type DeepOmit<T, K> = T extends DeepOmitPrimitive ? T : {
    [P in keyof T as P extends K ? never : P]: T[P] extends infer TP ? TP extends DeepOmitPrimitive ? TP : TP extends any[] ? DeepOmitArray<TP, K> : DeepOmit<TP, K> : never;
};
export {};
//# sourceMappingURL=DeepOmit.d.cts.map
