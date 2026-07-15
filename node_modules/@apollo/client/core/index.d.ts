export type { ApolloClientOptions, ApolloQueryResult, DefaultOptions, DevtoolsOptions, MutateResult, MutationOptions, QueryOptions, RefetchQueriesOptions, RefetchQueriesResult, SubscribeToMoreOptions, SubscriptionOptions, WatchQueryOptions, } from "./deprecated.js";
export { ApolloClient } from "./ApolloClient.js";
export { ObservableQuery } from "./ObservableQuery.js";
export { RefetchEventManager } from "./RefetchEventManager.js";
export { onlineSource } from "./refetchSources/onlineSource.js";
export { windowFocusSource } from "./refetchSources/windowFocusSource.js";
export type { ErrorPolicy, FetchPolicy, MutationFetchPolicy, RefetchWritePolicy, SubscribeToMoreFunction, SubscribeToMoreUpdateQueryFn, UpdateQueryMapFn, UpdateQueryOptions, WatchQueryFetchPolicy, } from "./watchQueryOptions.js";
export { NetworkStatus } from "./networkStatus.js";
export type { DataState, DataValue, DefaultContext, ErrorLike, GetDataState, InternalRefetchQueriesInclude, InternalRefetchQueriesMap, InternalRefetchQueriesOptions, InternalRefetchQueriesResult, InternalRefetchQueryDescriptor, MutationQueryReducer, MutationQueryReducersMap, MutationUpdaterFunction, NormalizedExecutionResult, OnQueryUpdated, OperationVariables, RefetchEvents, RefetchOn, RefetchQueriesInclude, RefetchQueriesPromiseResults, RefetchQueryDescriptor, SubscriptionObservable, TypedDocumentNode, TypeOverrides, } from "./types.js";
export { CombinedGraphQLErrors, CombinedProtocolErrors, LinkError, LocalStateError, ServerError, ServerParseError, UnconventionalError, } from "@apollo/client/errors";
export type { ApolloReducerConfig, Cache, DiffQueryAgainstStoreOptions, FieldFunctionOptions, FieldMergeFunction, FieldPolicy, FieldReadFunction, IdGetter, IdGetterObj, InMemoryCacheConfig, MergeInfo, MergeTree, NormalizedCache, NormalizedCacheObject, OptimisticStoreItem, PossibleTypesMap, ReactiveVar, ReadMergeModifyContext, ReadQueryOptions, StoreValue, Transaction, TypePolicies, TypePolicy, WatchFragmentOptions, WatchFragmentResult, } from "@apollo/client/cache";
export { ApolloCache, defaultDataIdFromObject, InMemoryCache, makeVar, MissingFieldError, } from "@apollo/client/cache";
export { ApolloLink, concat, empty, execute, from, split, } from "@apollo/client/link";
export type { ApolloPayloadResult, DocumentNode, FetchResult, GraphQLRequest, Operation, RequestHandler, } from "@apollo/client/link";
export { checkFetcher, createHttpLink, createSignalIfSupported, defaultPrinter, fallbackHttpConfig, HttpLink, parseAndCheckHttpResponse, rewriteURIForGET, selectHttpOptionsAndBody, selectHttpOptionsAndBodyInternal, selectURI, } from "@apollo/client/link/http";
export type { FragmentType, MaybeMasked, Unmasked, } from "@apollo/client/masking";
export type { DocumentTransformCacheKey, Reference, StoreObject, } from "@apollo/client/utilities";
export { DocumentTransform, 
/** @deprecated Please import `isNetworkRequestSettled` from `@apollo/client/utilities`. */
isNetworkRequestSettled, isReference, Observable, } from "@apollo/client/utilities";
export { setVerbosity as setLogVerbosity } from "@apollo/client/utilities/invariant";
export { disableExperimentalFragmentVariables, disableFragmentWarnings, enableExperimentalFragmentVariables, gql, resetCaches, } from "graphql-tag";
export { build, version } from "../version.js";
import type { DefaultOptionsParentObject, PossibleDefaultOptions } from "./defaultOptions.js";
import type { QueryManager } from "./QueryManager.js";
import type { NextFetchPolicyContext } from "./watchQueryOptions.js";
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
export declare namespace InternalTypes {
    export type { DefaultOptionsParentObject, NextFetchPolicyContext, PossibleDefaultOptions, QueryManager, };
}
//# sourceMappingURL=index.d.ts.map
