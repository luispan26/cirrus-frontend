import type { ApolloClient, OperationVariables } from "@apollo/client";
type OptionsUnion<TData, TVariables extends OperationVariables> = ApolloClient.WatchQueryOptions<TData, TVariables> | ApolloClient.QueryOptions<TData, TVariables> | ApolloClient.MutateOptions<TData, TVariables, any>;
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
export declare function mergeOptions<TDefaultOptions extends Partial<OptionsUnion<any, any>>, TOptions extends TDefaultOptions>(defaults: TDefaultOptions | Partial<TDefaultOptions> | undefined, options: TOptions | Partial<TOptions>): TOptions & TDefaultOptions;
export {};
//# sourceMappingURL=mergeOptions.d.cts.map
