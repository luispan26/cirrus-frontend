export type { ApolloContextValue } from "./context/ApolloContext.js";
export { getApolloContext } from "./context/ApolloContext.js";
export { ApolloProvider } from "./context/ApolloProvider.js";
export { useApolloClient } from "./hooks-compiled/useApolloClient.js";
export { useLazyQuery } from "./hooks-compiled/useLazyQuery.js";
export { useMutation } from "./hooks-compiled/useMutation.js";
export { useQuery } from "./hooks-compiled/useQuery.js";
export { useSubscription } from "./hooks-compiled/useSubscription.js";
export { useReactiveVar } from "./hooks-compiled/useReactiveVar.js";
export { useFragment } from "./hooks-compiled/useFragment.js";
export { useSuspenseQuery } from "./hooks-compiled/useSuspenseQuery.js";
export { useBackgroundQuery } from "./hooks-compiled/useBackgroundQuery.js";
export { useSuspenseFragment } from "./hooks-compiled/useSuspenseFragment.js";
export { useLoadableQuery } from "./hooks-compiled/useLoadableQuery.js";
export { useQueryRefHandlers } from "./hooks-compiled/useQueryRefHandlers.js";
export { useReadQuery } from "./hooks-compiled/useReadQuery.js";
export { skipToken } from "./hooks-compiled/constants.js";
export type { SkipToken } from "./hooks-compiled/constants.js";
export type { PreloadQueryFetchPolicy, PreloadQueryFunction, PreloadQueryOptions, } from "./query-preloader/createQueryPreloader.js";
export { createQueryPreloader } from "./query-preloader/createQueryPreloader.js";
export type { PreloadedQueryRef, QueryRef, } from "@apollo/client/react/internal";
export type { BackgroundQueryHookFetchPolicy, BackgroundQueryHookOptions, LazyQueryExecFunction, LazyQueryHookExecOptions, LazyQueryHookOptions, LazyQueryResult, LazyQueryResultTuple, LoadableQueryFetchPolicy, LoadableQueryHookOptions, LoadQueryFunction, MutationFunctionOptions, MutationHookOptions, MutationResult, MutationTuple, OnDataOptions, OnSubscriptionDataOptions, QueryHookOptions, QueryResult, SubscriptionHookOptions, SubscriptionResult, SuspenseQueryHookFetchPolicy, SuspenseQueryHookOptions, UseBackgroundQueryResult, UseFragmentOptions, UseFragmentResult, UseLoadableQueryResult, UseQueryRefHandlersResult, UseReadQueryResult, UseSuspenseFragmentOptions, UseSuspenseFragmentResult, UseSuspenseQueryResult, } from "./types/deprecated.js";
import type { HookWrappers } from "./hooks/internal/wrapHook.js";
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
export declare namespace InternalTypes {
    export type { HookWrappers };
}
export declare const reactCompilerVersion: string = "1.0.0";
//# sourceMappingURL=index.compiled.d.ts.map
