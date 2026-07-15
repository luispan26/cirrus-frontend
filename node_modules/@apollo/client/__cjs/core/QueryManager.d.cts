import { Trie } from "@wry/trie";
import type { DocumentNode } from "graphql";
import { OperationTypeNode } from "graphql";
import { Observable } from "rxjs";
import type { ApolloCache, Cache } from "@apollo/client/cache";
import type { Incremental } from "@apollo/client/incremental";
import type { ApolloLink } from "@apollo/client/link";
import type { LocalState } from "@apollo/client/local-state";
import type { MaybeMasked } from "@apollo/client/masking";
import { DocumentTransform } from "@apollo/client/utilities";
import type { ExtensionsWithStreamInfo } from "@apollo/client/utilities/internal";
import { extensionsSymbol } from "@apollo/client/utilities/internal";
import type { ApolloClient } from "./ApolloClient.cjs";
import { NetworkStatus } from "./networkStatus.cjs";
import { ObservableQuery } from "./ObservableQuery.cjs";
import type { DataState, DefaultContext, InternalRefetchQueriesInclude, InternalRefetchQueriesMap, InternalRefetchQueriesOptions, OperationVariables, QueryNotification, SubscriptionObservable } from "./types.cjs";
import type { ErrorPolicy, MutationFetchPolicy, WatchQueryFetchPolicy } from "./watchQueryOptions.cjs";
interface MutationStoreValue {
    mutation: DocumentNode;
    variables: Record<string, any>;
    loading: boolean;
    error: Error | null;
}
interface TransformCacheEntry {
    hasClientExports: boolean;
    hasForcedResolvers: boolean;
    hasNonreactiveDirective: boolean;
    hasIncrementalDirective: boolean;
    nonReactiveQuery: DocumentNode;
    clientQuery: DocumentNode | null;
    serverQuery: DocumentNode | null;
    defaultVars: OperationVariables;
    asQuery: DocumentNode;
    operationType: OperationTypeNode | undefined;
    violation?: Error | undefined;
}
interface MaskFragmentOptions<TData> {
    fragment: DocumentNode;
    data: TData;
    fragmentName?: string;
}
interface MaskOperationOptions<TData> {
    document: DocumentNode;
    data: TData;
    /**
     * Can be used to identify the cause to prevent warning for the same cause twice.
     * This would be an object like e.g. an `ObervableQuery`.
     * If the `cause` is not provided, we will warn every time.
     */
    cause?: object;
    fetchPolicy?: WatchQueryFetchPolicy;
}
interface QueryManagerOptions {
    client: ApolloClient;
    clientOptions: ApolloClient.Options;
    defaultOptions: ApolloClient.DefaultOptions;
    documentTransform: DocumentTransform | null | undefined;
    queryDeduplication: boolean;
    onBroadcast: undefined | (() => void);
    ssrMode: boolean;
    assumeImmutableResults: boolean;
    defaultContext: Partial<DefaultContext> | undefined;
    dataMasking: boolean;
    localState: LocalState | undefined;
    incrementalHandler: Incremental.Handler;
}
export declare namespace QueryManager {
    type Result<TData, TStates extends DataState<TData>["dataState"] = DataState<TData>["dataState"]> = ObservableQuery.Result<TData, TStates> & {
        [extensionsSymbol]?: ExtensionsWithStreamInfo;
    };
}
export declare class QueryManager {
    defaultOptions: ApolloClient.DefaultOptions;
    readonly client: ApolloClient;
    /**
     * The options that were passed to the ApolloClient constructor.
     */
    readonly clientOptions: ApolloClient.Options;
    readonly assumeImmutableResults: boolean;
    readonly documentTransform: DocumentTransform;
    readonly ssrMode: boolean;
    readonly defaultContext: Partial<DefaultContext>;
    readonly dataMasking: boolean;
    readonly incrementalHandler: Incremental.Handler;
    localState: LocalState | undefined;
    private queryDeduplication;
    /**
     * Whether to prioritize cache values over network results when
     * `fetchObservableWithInfo` is called.
     * This will essentially turn a `"network-only"` or `"cache-and-network"`
     * fetchPolicy into a `"cache-first"` fetchPolicy, but without influencing
     * the `fetchPolicy` of the `ObservableQuery`.
     *
     * This can e.g. be used to prioritize the cache during the first render after
     * SSR.
     */
    prioritizeCacheValues: boolean;
    private onBroadcast?;
    mutationStore?: {
        [mutationId: string]: MutationStoreValue;
    };
    /**
     * All ObservableQueries that currently have at least one subscriber.
     */
    obsQueries: Set<ObservableQuery<any, any>>;
    protected fetchCancelFns: Map<string, (error: any) => any>;
    constructor(options: QueryManagerOptions);
    get link(): ApolloLink;
    get cache(): ApolloCache;
    /**
     * Call this method to terminate any active query processes, making it safe
     * to dispose of this QueryManager instance.
     */
    stop(): void;
    private cancelPendingFetches;
    mutate<TData, TVariables extends OperationVariables, TCache extends ApolloCache>({ mutation, variables, optimisticResponse, updateQueries, refetchQueries, awaitRefetchQueries, update: updateWithProxyFn, onQueryUpdated, fetchPolicy, errorPolicy, keepRootFields, context, }: ApolloClient.MutateOptions<TData, TVariables, TCache> & {
        errorPolicy: ErrorPolicy;
        fetchPolicy: MutationFetchPolicy;
    }): Promise<ApolloClient.MutateResult<MaybeMasked<TData>>>;
    fetchQuery<TData, TVariables extends OperationVariables>(options: ApolloClient.WatchQueryOptions<TData, TVariables>, networkStatus?: NetworkStatus): Promise<ApolloClient.QueryResult<TData>>;
    transform(document: DocumentNode): DocumentNode;
    private transformCache;
    getDocumentInfo(document: DocumentNode): TransformCacheEntry;
    getVariables<TVariables extends OperationVariables>(document: DocumentNode, variables?: TVariables): TVariables;
    watchQuery<TData, TVariables extends OperationVariables = OperationVariables>(options: ApolloClient.WatchQueryOptions<TData, TVariables>): ObservableQuery<TData, TVariables>;
    query<TData, TVariables extends OperationVariables = OperationVariables>(options: ApolloClient.QueryOptions<TData, TVariables>): Promise<ApolloClient.QueryResult<MaybeMasked<TData>>>;
    private requestIdCounter;
    generateRequestId(): number;
    clearStore(options?: Cache.ResetOptions): Promise<void>;
    getObservableQueries(include?: InternalRefetchQueriesInclude): Set<ObservableQuery<any, OperationVariables>>;
    refetchObservableQueries(includeStandby?: boolean): Promise<ApolloClient.QueryResult<any>[]>;
    startGraphQLSubscription<TData = unknown>(options: ApolloClient.SubscribeOptions<TData>): SubscriptionObservable<ApolloClient.SubscribeResult<TData>>;
    broadcastQueries(): void;
    protected inFlightLinkObservables: Trie<{
        observable?: Observable<ApolloLink.Result<any>>;
        restart?: () => void;
    }>;
    private getObservableFromLink;
    private getResultsFromLink;
    fetchObservableWithInfo<TData, TVariables extends OperationVariables>(options: ApolloClient.WatchQueryOptions<TData, TVariables>, { networkStatus, query, fetchQueryOperator, onCacheHit, observableQuery, exposeExtensions, }: {
        networkStatus?: NetworkStatus;
        query?: DocumentNode;
        fetchQueryOperator?: <T>(source: Observable<T>) => Observable<T>;
        onCacheHit?: () => void;
        observableQuery?: ObservableQuery<TData, TVariables> | undefined;
        /**
         * Attach `extensions` to the result object so that it is accessible by
         * the calling code without being exposed to the emitted result.
         *
         * @remarks
         * Used by e.g. `fetchMore` to add `extensions` to the `cache.writeQuery`
         * call since it uses a `no-cache` query and cannot be written in
         * `QueryInfo`.
         */
        exposeExtensions?: boolean;
    }): ObservableAndInfo<TData>;
    refetchQueries<TResult>({ updateCache, include, optimistic, removeOptimistic, onQueryUpdated, }: InternalRefetchQueriesOptions<ApolloCache, TResult>): InternalRefetchQueriesMap<TResult>;
    private noCacheWarningsByCause;
    maskOperation<TData = unknown>(options: MaskOperationOptions<TData>): MaybeMasked<TData>;
    maskFragment<TData = unknown>(options: MaskFragmentOptions<TData>): TData;
    private fetchQueryByPolicy;
}
interface ObservableAndInfo<TData> {
    fromLink: boolean;
    observable: Observable<QueryNotification.Value<TData>>;
}
export {};
//# sourceMappingURL=QueryManager.d.cts.map
