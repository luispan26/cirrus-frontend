import type { ObservableQuery } from "@apollo/client";
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
export declare function toQueryResult<TData = unknown>(value: ObservableQuery.Result<TData>): {
    data: TData | undefined;
    error?: import("@apollo/client").ErrorLike;
};
//# sourceMappingURL=toQueryResult.d.ts.map
