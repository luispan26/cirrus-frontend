import type { Primitive } from "@apollo/client/utilities/internal";
type DeepPartialPrimitive = Primitive | Date | RegExp;
/**
 * Deeply makes all properties in `T` optional.
 */
export type DeepPartial<T> = T extends DeepPartialPrimitive ? T : T extends Map<infer TKey, infer TValue> ? DeepPartialMap<TKey, TValue> : T extends ReadonlyMap<infer TKey, infer TValue> ? DeepPartialReadonlyMap<TKey, TValue> : T extends Set<infer TItem> ? DeepPartialSet<TItem> : T extends ReadonlySet<infer TItem> ? DeepPartialReadonlySet<TItem> : T extends (...args: any[]) => unknown ? T | undefined : T extends object ? T extends (ReadonlyArray<infer TItem>) ? TItem[] extends (T) ? readonly TItem[] extends T ? ReadonlyArray<DeepPartial<TItem>> : Array<DeepPartial<TItem>> : DeepPartialObject<T> : DeepPartialObject<T> : unknown;
type DeepPartialMap<TKey, TValue> = {} & Map<DeepPartial<TKey>, DeepPartial<TValue>>;
type DeepPartialReadonlyMap<TKey, TValue> = {} & ReadonlyMap<DeepPartial<TKey>, DeepPartial<TValue>>;
type DeepPartialSet<T> = {} & Set<DeepPartial<T>>;
type DeepPartialReadonlySet<T> = {} & ReadonlySet<DeepPartial<T>>;
type DeepPartialObject<T extends object> = {
    [K in keyof T]?: DeepPartial<T[K]>;
};
export {};
//# sourceMappingURL=DeepPartial.d.cts.map
