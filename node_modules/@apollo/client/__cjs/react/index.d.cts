export type { ApolloContextValue } from "./context/ApolloContext.cjs";
export { getApolloContext } from "./context/ApolloContext.cjs";
export { ApolloProvider } from "./context/ApolloProvider.cjs";
export { useApolloClient } from "./hooks/useApolloClient.cjs";
export { useLazyQuery } from "./hooks/useLazyQuery.cjs";
export { useMutation } from "./hooks/useMutation.cjs";
export { useQuery } from "./hooks/useQuery.cjs";
export { useSubscription } from "./hooks/useSubscription.cjs";
export { useReactiveVar } from "./hooks/useReactiveVar.cjs";
export { useFragment } from "./hooks/useFragment.cjs";
export { useSuspenseQuery } from "./hooks/useSuspenseQuery.cjs";
export { useBackgroundQuery } from "./hooks/useBackgroundQuery.cjs";
export { useSuspenseFragment } from "./hooks/useSuspenseFragment.cjs";
export { useLoadableQuery } from "./hooks/useLoadableQuery.cjs";
export { useQueryRefHandlers } from "./hooks/useQueryRefHandlers.cjs";
export { useReadQuery } from "./hooks/useReadQuery.cjs";
export { skipToken } from "./hooks/constants.cjs";
export type { SkipToken } from "./hooks/constants.cjs";
export type { PreloadQueryFetchPolicy, PreloadQueryFunction, PreloadQueryOptions, } from "./query-preloader/createQueryPreloader.cjs";
export { createQueryPreloader } from "./query-preloader/createQueryPreloader.cjs";
export type { PreloadedQueryRef, QueryRef, } from "@apollo/client/react/internal";
export type { BackgroundQueryHookFetchPolicy, BackgroundQueryHookOptions, LazyQueryExecFunction, LazyQueryHookExecOptions, LazyQueryHookOptions, LazyQueryResult, LazyQueryResultTuple, LoadableQueryFetchPolicy, LoadableQueryHookOptions, LoadQueryFunction, MutationFunctionOptions, MutationHookOptions, MutationResult, MutationTuple, OnDataOptions, OnSubscriptionDataOptions, QueryHookOptions, QueryResult, SubscriptionHookOptions, SubscriptionResult, SuspenseQueryHookFetchPolicy, SuspenseQueryHookOptions, UseBackgroundQueryResult, UseFragmentOptions, UseFragmentResult, UseLoadableQueryResult, UseQueryRefHandlersResult, UseReadQueryResult, UseSuspenseFragmentOptions, UseSuspenseFragmentResult, UseSuspenseQueryResult, } from "./types/deprecated.cjs";
import type { HookWrappers } from "./hooks/internal/wrapHook.cjs";
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
export declare namespace InternalTypes {
    export type { HookWrappers };
}
export declare const reactCompilerVersion: string;
//# sourceMappingURL=index.d.cts.map
