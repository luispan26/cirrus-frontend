import type { InternalTypes as ReactInternalTypes } from "@apollo/client/react";
export { getSuspenseCache } from "./cache/getSuspenseCache.cjs";
export type { CacheKey, FragmentKey, QueryKey } from "./cache/types.cjs";
export type { PreloadedQueryRef, QueryRef } from "./cache/QueryReference.cjs";
export { assertWrappedQueryRef, getWrappedPromise, InternalQueryReference, unwrapQueryRef, updateWrappedQueryRef, wrapQueryRef, } from "./cache/QueryReference.cjs";
export type { SuspenseCacheOptions } from "./cache/SuspenseCache.cjs";
export type HookWrappers = ReactInternalTypes.HookWrappers;
export declare const wrapperSymbol: unique symbol;
export type { FetchMoreFunction, RefetchFunction } from "./types.cjs";
//# sourceMappingURL=index.d.cts.map
