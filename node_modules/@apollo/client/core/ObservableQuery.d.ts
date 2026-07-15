import type { DocumentNode } from "graphql";
import type { InteropObservable, Observer, Subscribable, Subscription } from "rxjs";
import { Observable } from "rxjs";
import type { Cache, MissingFieldError } from "@apollo/client/cache";
import type { MissingTree } from "@apollo/client/cache";
import type { MaybeMasked, Unmasked } from "@apollo/client/masking";
import type { ApolloClient } from "./ApolloClient.js";
import { NetworkStatus } from "./networkStatus.js";
import type { QueryManager } from "./QueryManager.js";
import type { DataState, DefaultContext, ErrorLike, GetDataState, OperationVariables, RefetchOn, TypedDocumentNode } from "./types.js";
import type { ErrorPolicy, NextFetchPolicyContext, RefetchWritePolicy, SubscribeToMoreUpdateQueryFn, UpdateQueryMapFn, WatchQueryFetchPolicy } from "./watchQueryOptions.js";
export declare namespace ObservableQuery {
    type Options<TData = unknown, TVariables extends OperationVariables = OperationVariables> = {
        /**
        * Specifies how the query interacts with the Apollo Client cache during execution (for example, whether it checks the cache for results before sending a request to the server).
        * 
        * For details, see [Setting a fetch policy](https://www.apollographql.com/docs/react/data/queries/#setting-a-fetch-policy).
        * 
        * The default value is `cache-first`.
        * 
        * @docGroup 3. Caching options
        */
        fetchPolicy: WatchQueryFetchPolicy;
        /**
        * Specifies the `FetchPolicy` to be used after this query has completed.
        * 
        * @docGroup 3. Caching options
        */
        nextFetchPolicy?: WatchQueryFetchPolicy | ((this: ApolloClient.WatchQueryOptions<TData, TVariables>, currentFetchPolicy: WatchQueryFetchPolicy, context: NextFetchPolicyContext<TData, TVariables>) => WatchQueryFetchPolicy);
        /**
        * Defaults to the initial value of options.fetchPolicy, but can be explicitly
        * configured to specify the WatchQueryFetchPolicy to revert back to whenever
        * variables change (unless nextFetchPolicy intervenes).
        * 
        * @docGroup 3. Caching options
        */
        initialFetchPolicy: WatchQueryFetchPolicy;
        /**
        * Specifies whether a `NetworkStatus.refetch` operation should merge
        * incoming field data with existing data, or overwrite the existing data.
        * Overwriting is probably preferable, but merging is currently the default
        * behavior, for backwards compatibility with Apollo Client 3.x.
        * 
        * @docGroup 3. Caching options
        */
        refetchWritePolicy?: RefetchWritePolicy;
        /**
        * Specifies how the query handles a response that returns both GraphQL errors and partial results.
        * 
        * For details, see [GraphQL error policies](https://www.apollographql.com/docs/react/data/error-handling/#graphql-error-policies).
        * 
        * The default value is `none`, meaning that the query result includes error details but not partial results.
        * 
        * @docGroup 1. Operation options
        */
        errorPolicy?: ErrorPolicy;
        /**
        * If you're using [Apollo Link](https://www.apollographql.com/docs/react/api/link/introduction/), this object is the initial value of the `context` object that's passed along your link chain.
        * 
        * @docGroup 2. Networking options
        */
        context?: DefaultContext;
        /**
        * Specifies the interval (in milliseconds) at which the query polls for updated results.
        * 
        * The default value is `0` (no polling).
        * 
        * @docGroup 2. Networking options
        */
        pollInterval?: number;
        /**
        * If `true`, the in-progress query's associated component re-renders whenever the network status changes or a network error occurs.
        * 
        * The default value is `true`.
        * 
        * @docGroup 2. Networking options
        */
        notifyOnNetworkStatusChange?: boolean;
        /**
        * If `true`, the query can return partial results from the cache if the cache doesn't contain results for all queried fields.
        * 
        * The default value is `false`.
        * 
        * @docGroup 3. Caching options
        */
        returnPartialData?: boolean;
        /**
        * A callback function that's called whenever a refetch attempt occurs
        * while polling. If the function returns `true`, the refetch is
        * skipped and not reattempted until the next poll interval.
        * 
        * @docGroup 2. Networking options
        */
        skipPollAttempt?: () => boolean;
        /**
        * A GraphQL query string parsed into an AST with the gql template literal.
        * 
        * @docGroup 1. Operation options
        */
        query: DocumentNode | TypedDocumentNode<TData, TVariables>;
        /**
        * An object containing all of the GraphQL variables your query requires to execute.
        * 
        * Each key in the object corresponds to a variable name, and that key's value corresponds to the variable value.
        * 
        * @docGroup 1. Operation options
        */
        variables: TVariables;
        /**
        * Determines whether events trigger refetches for the query. Provide an
        * object mapping each refetch event to `true` (enable), `false` (disable)
        * or a callback function that returns `true`/`false` to control individual
        * events. Provide `false` to disable all automatic refetch events for this
        * query. Provide `true` to enable all automatic refetch events for this query.
        * Provide a callback function to perform additional logic to determine
        * whether to enable or disable a refetch for a query.
        * 
        * `@remarks`
        * `refetchOn` inherits from `defaultOptions.watchQuery.refetchOn`. If
        * `defaultOptions.watchQuery.refetchOn` is not set, all refetch events are
        * enabled by default.
        * 
        * This option only has an effect when the client is configured with a
        * `refetchEventManager`.
        * @docGroup 1. Operation options
        */
        refetchOn?: RefetchOn.Option;
    };
    type FetchMoreOptions<TData, TVariables extends OperationVariables, TFetchData = TData, TFetchVars extends OperationVariables = TVariables> = {
        /**
        * A GraphQL query string parsed into an AST with the gql template literal.
        * 
        * @docGroup 1. Operation options
        */
        query?: DocumentNode | TypedDocumentNode<TFetchData, TFetchVars>;
        /**
        * An object containing all of the GraphQL variables your query requires to execute.
        * 
        * Each key in the object corresponds to a variable name, and that key's value corresponds to the variable value.
        * 
        * @docGroup 1. Operation options
        */
        variables?: Partial<NoInfer<TFetchVars>>;
        /**
        * Specifies how the query handles a response that returns both GraphQL errors and partial results.
        * 
        * For details, see [GraphQL error policies](https://www.apollographql.com/docs/react/data/error-handling/#graphql-error-policies).
        * 
        * The default value is `none`, meaning that the query result includes error details but not partial results.
        * 
        * @docGroup 1. Operation options
        */
        errorPolicy?: ErrorPolicy;
        /**
        * If you're using [Apollo Link](https://www.apollographql.com/docs/react/api/link/introduction/), this object is the initial value of the `context` object that's passed along your link chain.
        * 
        * @docGroup 2. Networking options
        */
        context?: DefaultContext;
        updateQuery?: (previousQueryResult: Unmasked<TData>, options: {
            fetchMoreResult: Unmasked<TFetchData>;
            variables: TFetchVars;
        }) => Unmasked<TData>;
    };
    interface SubscribeToMoreOptions<TData = unknown, TSubscriptionVariables extends OperationVariables = OperationVariables, TSubscriptionData = TData, TVariables extends OperationVariables = TSubscriptionVariables> {
        document: DocumentNode | TypedDocumentNode<TSubscriptionData, TSubscriptionVariables>;
        variables?: TSubscriptionVariables;
        updateQuery?: SubscribeToMoreUpdateQueryFn<TData, TVariables, TSubscriptionData>;
        onError?: (error: ErrorLike) => void;
        context?: DefaultContext;
    }
    /**
    * @internal
    * This describes the `WatchOptions` used by `ObservableQuery` to
    * subscribe to the cache.
    * 
    * @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
    */
    interface CacheWatchOptions<TData = unknown, TVariables extends OperationVariables = OperationVariables> extends Cache.WatchOptions<TData, TVariables> {
        /**
        * @internal
        * We cannot suppress the broadcast completely, since that would
        * result in external updates to be lost if we go from
        * (external A) -> (own B) -> (external C) when A and C have the same
        * value.
        * Without the `own B` being broadcast, the `cache.watch` would swallow
        * C.
        * So instead we track the last "own diff" and suppress further processing
        * in the callback.
        * 
        * @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
        */
        lastOwnDiff?: Cache.DiffResult<TData>;
    }
    type Result<TData, TStates extends DataState<TData>["dataState"] = DataState<TData>["dataState"]> = {
        /**
        * A single ErrorLike object describing the error that occurred during the latest
        * query execution.
        * 
        * For more information, see [Handling operation errors](https://www.apollographql.com/docs/react/data/error-handling/).
        * 
        * @docGroup 1. Operation data
        */
        error?: ErrorLike;
        /**
        * If `true`, the query is still in flight.
        * 
        * @docGroup 2. Network info
        */
        loading: boolean;
        /**
        * A number indicating the current network state of the query's associated request. [See possible values.](https://github.com/apollographql/apollo-client/blob/d96f4578f89b933c281bb775a39503f6cdb59ee8/src/core/networkStatus.ts#L4)
        * 
        * Used in conjunction with the [`notifyOnNetworkStatusChange`](#notifyonnetworkstatuschange) option.
        * 
        * @docGroup 2. Network info
        */
        networkStatus: NetworkStatus;
        /**
        * Describes whether `data` is a complete or partial result. This flag is only
        * set when `returnPartialData` is `true` in query options.
        * 
        * @deprecated This field will be removed in a future version of Apollo Client.
        * @docGroup 1. Operation data
        */
        partial: boolean;
    } & GetDataState<TData, TStates>;
    /**
     * Promise returned by `reobserve` and `refetch` methods.
     *
     * By default, if the `ObservableQuery` is not interested in the result
     * of this operation anymore, the network operation will be cancelled.
     *
     * This has an additional `retain` method that can be used to keep the
     * network operation running until it is finished nonetheless.
     */
    interface ResultPromise<T> extends Promise<T> {
        /**
         * Keep the network operation running until it is finished, even if
         * `ObservableQuery` unsubscribed from the operation.
         */
        retain(): this;
    }
    namespace DocumentationTypes {
        type OperatorFunctionChain<From, To> = [];
        interface ObservableMethods<TData, OperatorResult> {
            /**
            * Used to stitch together functional operators into a chain.
            * 
            * @example
            * 
            * ```ts
            * import { filter, map } from 'rxjs';
            * 
            * observableQuery
            *   .pipe(
            *     filter(...),
            *     map(...),
            *   )
            *   .subscribe(x => console.log(x));
            * ```
            * 
            * @returns The Observable result of all the operators having been called
            * in the order they were passed in.
            */
            pipe(...operators: OperatorFunctionChain<ObservableQuery.Result<TData>, OperatorResult>): Observable<OperatorResult>;
            /**
            * Subscribes to the `ObservableQuery`.
            * @param observerOrNext - Either an RxJS `Observer` with some or all callback methods,
            * or the `next` handler that is called for each value emitted from the subscribed Observable.
            * @returns A subscription reference to the registered handlers.
            */
            subscribe(observerOrNext: Partial<Observer<ObservableQuery.Result<MaybeMasked<TData>>>> | ((value: ObservableQuery.Result<MaybeMasked<TData>>) => void)): Subscription;
        }
    }
}
export declare class ObservableQuery<TData = unknown, TVariables extends OperationVariables = OperationVariables> implements Subscribable<ObservableQuery.Result<MaybeMasked<TData>>>, InteropObservable<ObservableQuery.Result<MaybeMasked<TData>>> {
    readonly options: ObservableQuery.Options<TData, TVariables>;
    readonly queryName?: string;
    private variablesUnknown;
    /**
    * @internal will be read and written from `QueryInfo`
    * 
    * @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
    */
    _lastWrite?: unknown;
    get query(): TypedDocumentNode<TData, TVariables>;
    /**
     * An object containing the variables that were provided for the query.
     */
    get variables(): TVariables;
    private unsubscribeFromCache?;
    private input;
    private subject;
    private isTornDown;
    private queryManager;
    private subscriptions;
    /**
     * If an `ObservableQuery` is created with a `network-only` fetch policy,
     * it should actually start receiving cache updates, but not before it has
     * received the first result from the network.
     */
    private waitForNetworkResult;
    private lastQuery;
    private linkSubscription?;
    private pollingInfo?;
    private get networkStatus();
    private get cache();
    constructor({ queryManager, options, transformedQuery, }: {
        queryManager: QueryManager;
        options: ApolloClient.WatchQueryOptions<TData, TVariables>;
        transformedQuery?: DocumentNode | TypedDocumentNode<TData, TVariables>;
        queryId?: string;
    });
    private initializeObservablesQueue;
    /**
     * Subscribes to the `ObservableQuery`.
     * @param observerOrNext - Either an RxJS `Observer` with some or all callback methods,
     * or the `next` handler that is called for each value emitted from the subscribed Observable.
     * @returns A subscription reference to the registered handlers.
     */
    subscribe: (observerOrNext: Partial<Observer<ObservableQuery.Result<MaybeMasked<TData>>>> | ((value: ObservableQuery.Result<MaybeMasked<TData>>) => void)) => Subscription;
    /**
     * Used to stitch together functional operators into a chain.
     *
     * @example
     *
     * ```ts
     * import { filter, map } from 'rxjs';
     *
     * observableQuery
     *   .pipe(
     *     filter(...),
     *     map(...),
     *   )
     *   .subscribe(x => console.log(x));
     * ```
     *
     * @returns The Observable result of all the operators having been called
     * in the order they were passed in.
     */
    pipe: Observable<ObservableQuery.Result<MaybeMasked<TData>>>["pipe"];
    [Symbol.observable]: () => Subscribable<ObservableQuery.Result<MaybeMasked<TData>>>;
    ["@@observable"]: () => Subscribable<ObservableQuery.Result<MaybeMasked<TData>>>;
    /**
    * @internal
    * 
    * @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
    */
    getCacheDiff({ optimistic }?: {
        optimistic?: boolean | undefined;
    }): Cache.DiffResult<TData>;
    private getInitialResult;
    private resubscribeCache;
    private stableLastResult?;
    getCurrentResult(): ObservableQuery.Result<MaybeMasked<TData>>;
    /**
     * Update the variables of this observable query, and fetch the new results.
     * This method should be preferred over `setVariables` in most use cases.
     *
     * Returns a `ResultPromise` with an additional `.retain()` method. Calling
     * `.retain()` keeps the network operation running even if the `ObservableQuery`
     * no longer requires the result.
     *
     * Note: `refetch()` guarantees that a value will be emitted from the
     * observable, even if the result is deep equal to the previous value.
     *
     * @param variables - The new set of variables. If there are missing variables,
     * the previous values of those variables will be used.
     */
    refetch(variables?: Partial<TVariables>): ObservableQuery.ResultPromise<ApolloClient.QueryResult<TData>>;
    /**
     * A function that helps you fetch the next set of results for a [paginated list field](https://www.apollographql.com/docs/react/pagination/core-api/).
     */
    fetchMore<TFetchData = TData, TFetchVars extends OperationVariables = TVariables>(options: ObservableQuery.FetchMoreOptions<TData, TVariables, TFetchData, TFetchVars>): Promise<ApolloClient.QueryResult<TFetchData>>;
    /**
     * A function that enables you to execute a [subscription](https://www.apollographql.com/docs/react/data/subscriptions/), usually to subscribe to specific fields that were included in the query.
     *
     * This function returns _another_ function that you can call to terminate the subscription.
     */
    subscribeToMore<TSubscriptionData = TData, TSubscriptionVariables extends OperationVariables = TVariables>(options: ObservableQuery.SubscribeToMoreOptions<TData, TSubscriptionVariables, TSubscriptionData, TVariables>): () => void;
    /**
    * @internal
    * 
    * @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
    */
    applyOptions(newOptions: Partial<ObservableQuery.Options<TData, TVariables>>): void;
    /**
     * Update the variables of this observable query, and fetch the new results
     * if they've changed. Most users should prefer `refetch` instead of
     * `setVariables` in order to to be properly notified of results even when
     * they come from the cache.
     *
     * Note: `setVariables()` guarantees that a value will be emitted from the
     * observable, even if the result is deeply equal to the previous value.
     *
     * Note: the promise will resolve with the last emitted result
     * when either the variables match the current variables or there
     * are no subscribers to the query.
     *
     * @param variables - The new set of variables. If there are missing variables,
     * the previous values of those variables will be used.
     */
    setVariables(variables: TVariables): Promise<ApolloClient.QueryResult<TData>>;
    /**
     * A function that enables you to update the query's cached result without executing a followup GraphQL operation.
     *
     * See [using updateQuery and updateFragment](https://www.apollographql.com/docs/react/caching/cache-interaction/#using-updatequery-and-updatefragment) for additional information.
     */
    updateQuery(mapFn: UpdateQueryMapFn<TData, TVariables>): void;
    /**
     * A function that instructs the query to begin re-executing at a specified interval (in milliseconds).
     */
    startPolling(pollInterval: number): void;
    /**
     * A function that instructs the query to stop polling after a previous call to `startPolling`.
     */
    stopPolling(): void;
    private applyNextFetchPolicy;
    private fetch;
    private didWarnCacheOnlyPolling;
    private updatePolling;
    private cancelPolling;
    /**
     * Reevaluate the query, optionally against new options. New options will be
     * merged with the current options when given.
     *
     * Note: `variables` can be reset back to their defaults (typically empty) by calling `reobserve` with
     * `variables: undefined`.
     */
    reobserve(newOptions?: Partial<ObservableQuery.Options<TData, TVariables>>): ObservableQuery.ResultPromise<ApolloClient.QueryResult<MaybeMasked<TData>>>;
    private _reobserve;
    hasObservers(): boolean;
    /**
     * Tears down the `ObservableQuery` and stops all active operations by sending a `complete` notification.
     */
    stop(): void;
    private tearDownQuery;
    private transformDocument;
    private maskResult;
    private dirty;
    private notifyTimeout?;
    /**
    * @internal
    * 
    * @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
    */
    private resetNotifications;
    /**
    * @internal
    * 
    * @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
    */
    private scheduleNotify;
    /**
    * @internal
    * 
    * @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
    */
    notify(scheduled?: boolean): void;
    private activeOperations;
    private pushOperation;
    private calculateNetworkStatus;
    private abortActiveOperations;
    /**
    * @internal
    * Called from `clearStore`.
    *
    * - resets the query to its initial state
    * - cancels all active operations and their subscriptions
    * 
    * @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
    */
    reset(): void;
    /**
    * @internal
    * 
    * @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
    */
    private setResult;
    private operator;
    private reobserveCacheFirst;
    private getVariablesWithDefaults;
}
export declare function logMissingFieldErrors(missing: MissingFieldError | MissingTree | undefined): void;
//# sourceMappingURL=ObservableQuery.d.ts.map
