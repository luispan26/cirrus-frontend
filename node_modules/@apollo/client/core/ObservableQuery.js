import { equal } from "@wry/equality";
import { BehaviorSubject, filter, Observable, share, Subject, tap } from "rxjs";
import { isNetworkRequestInFlight, isNetworkRequestSettled, } from "@apollo/client/utilities";
import { __DEV__ } from "@apollo/client/utilities/environment";
import { compact, equalByQuery, extensionsSymbol, filterMap, getOperationDefinition, getOperationName, getQueryDefinition, preventUnhandledRejection, toQueryResult, variablesUnknownSymbol, } from "@apollo/client/utilities/internal";
import { invariant } from "@apollo/client/utilities/invariant";
import { NetworkStatus } from "./networkStatus.js";
const { assign, hasOwnProperty } = Object;
const uninitialized = {
    loading: true,
    networkStatus: NetworkStatus.loading,
    data: undefined,
    dataState: "empty",
    partial: true,
};
const empty = {
    loading: false,
    networkStatus: NetworkStatus.ready,
    data: undefined,
    dataState: "empty",
    partial: true,
};
export class ObservableQuery {
    options;
    queryName;
    variablesUnknown = false;
    /**
    * @internal will be read and written from `QueryInfo`
    * 
    * @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
    */
    _lastWrite;
    // The `query` computed property will always reflect the document transformed
    // by the last run query. `this.options.query` will always reflect the raw
    // untransformed query to ensure document transforms with runtime conditionals
    // are run on the original document.
    get query() {
        return this.lastQuery;
    }
    /**
     * An object containing the variables that were provided for the query.
     */
    get variables() {
        return this.options.variables;
    }
    unsubscribeFromCache;
    input;
    subject;
    isTornDown;
    queryManager;
    subscriptions = new Set();
    /**
     * If an `ObservableQuery` is created with a `network-only` fetch policy,
     * it should actually start receiving cache updates, but not before it has
     * received the first result from the network.
     */
    waitForNetworkResult;
    lastQuery;
    linkSubscription;
    pollingInfo;
    get networkStatus() {
        return this.subject.getValue().result.networkStatus;
    }
    get cache() {
        return this.queryManager.cache;
    }
    constructor({ queryManager, options, transformedQuery = queryManager.transform(options.query), }) {
        this.queryManager = queryManager;
        // active state
        this.waitForNetworkResult = options.fetchPolicy === "network-only";
        this.isTornDown = false;
        this.subscribeToMore = this.subscribeToMore.bind(this);
        this.maskResult = this.maskResult.bind(this);
        const { watchQuery: { fetchPolicy: defaultFetchPolicy = "cache-first" } = {}, } = queryManager.defaultOptions;
        const { fetchPolicy = defaultFetchPolicy, 
        // Make sure we don't store "standby" as the initialFetchPolicy.
        initialFetchPolicy = fetchPolicy === "standby" ? defaultFetchPolicy : (fetchPolicy), } = options;
        if (options[variablesUnknownSymbol]) {
            invariant(fetchPolicy === "standby", 82);
            this.variablesUnknown = true;
        }
        this.lastQuery = transformedQuery;
        this.options = {
            ...options,
            // Remember the initial options.fetchPolicy so we can revert back to this
            // policy when variables change. This information can also be specified
            // (or overridden) by providing options.initialFetchPolicy explicitly.
            initialFetchPolicy,
            // This ensures this.options.fetchPolicy always has a string value, in
            // case options.fetchPolicy was not provided.
            fetchPolicy,
            variables: this.getVariablesWithDefaults(options.variables),
        };
        this.initializeObservablesQueue();
        this["@@observable"] = () => this;
        if (Symbol.observable) {
            this[Symbol.observable] = () => this;
        }
        const opDef = getOperationDefinition(this.query);
        this.queryName = opDef && opDef.name && opDef.name.value;
    }
    initializeObservablesQueue() {
        this.subject = new BehaviorSubject({
            query: this.query,
            variables: this.variables,
            result: uninitialized,
            meta: {},
        });
        const observable = this.subject.pipe(tap({
            subscribe: () => {
                if (!this.subject.observed) {
                    this.reobserve();
                    // TODO: See if we can rework updatePolling to better handle this.
                    // reobserve calls updatePolling but this `subscribe` callback is
                    // called before the subject is subscribed to so `updatePolling`
                    // can't accurately detect if there is an active subscription.
                    // Calling it again here ensures that it can detect if it can poll
                    setTimeout(() => this.updatePolling());
                }
            },
            unsubscribe: () => {
                if (!this.subject.observed) {
                    this.tearDownQuery();
                }
            },
        }), filterMap(({ query, variables, result: current, meta }, context) => {
            const { shouldEmit } = meta;
            if (current === uninitialized) {
                // reset internal state after `ObservableQuery.reset()`
                context.previous = undefined;
                context.previousVariables = undefined;
            }
            if (this.options.fetchPolicy === "standby" ||
                shouldEmit === 2 /* EmitBehavior.never */)
                return;
            if (shouldEmit === 1 /* EmitBehavior.force */)
                return emit();
            const { previous, previousVariables } = context;
            if (previous) {
                const documentInfo = this.queryManager.getDocumentInfo(query);
                const dataMasking = this.queryManager.dataMasking;
                const maskedQuery = dataMasking ? documentInfo.nonReactiveQuery : query;
                const resultIsEqual = dataMasking || documentInfo.hasNonreactiveDirective ?
                    equalByQuery(maskedQuery, previous, current, variables)
                    : equal(previous, current);
                if (resultIsEqual && equal(previousVariables, variables)) {
                    return;
                }
            }
            if (shouldEmit === 3 /* EmitBehavior.networkStatusChange */ &&
                (!this.options.notifyOnNetworkStatusChange ||
                    equal(previous, current))) {
                return;
            }
            return emit();
            function emit() {
                context.previous = current;
                context.previousVariables = variables;
                return current;
            }
        }, () => ({})));
        this.pipe = observable.pipe.bind(observable);
        this.subscribe = observable.subscribe.bind(observable);
        this.input = new Subject();
        // we want to feed many streams into `this.subject`, but none of them should
        // be able to close `this.input`
        this.input.complete = () => { };
        this.input.pipe(this.operator).subscribe(this.subject);
    }
    // We can't use Observable['subscribe'] here as the type as it conflicts with
    // the ability to infer T from Subscribable<T>. This limits the surface area
    // to the non-deprecated signature which works properly with type inference.
    /**
     * Subscribes to the `ObservableQuery`.
     * @param observerOrNext - Either an RxJS `Observer` with some or all callback methods,
     * or the `next` handler that is called for each value emitted from the subscribed Observable.
     * @returns A subscription reference to the registered handlers.
     */
    subscribe;
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
    pipe;
    [Symbol.observable];
    ["@@observable"];
    /**
    * @internal
    * 
    * @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
    */
    getCacheDiff({ optimistic = true } = {}) {
        return this.cache.diff({
            query: this.query,
            variables: this.variables,
            returnPartialData: true,
            optimistic,
        });
    }
    getInitialResult(initialFetchPolicy) {
        let fetchPolicy = initialFetchPolicy || this.options.fetchPolicy;
        if (this.queryManager.prioritizeCacheValues &&
            (fetchPolicy === "network-only" || fetchPolicy === "cache-and-network")) {
            fetchPolicy = "cache-first";
        }
        const cacheResult = () => {
            const diff = this.getCacheDiff();
            // TODO: queryInfo.getDiff should handle this since cache.diff returns a
            // null when returnPartialData is false
            const data = this.options.returnPartialData || diff.complete ?
                diff.result ?? undefined
                : undefined;
            return this.maskResult({
                data,
                dataState: diff.complete ? "complete"
                    : data === undefined ? "empty"
                        : "partial",
                loading: !diff.complete,
                networkStatus: diff.complete ? NetworkStatus.ready : NetworkStatus.loading,
                partial: !diff.complete,
            });
        };
        switch (fetchPolicy) {
            case "cache-only": {
                return {
                    ...cacheResult(),
                    loading: false,
                    networkStatus: NetworkStatus.ready,
                };
            }
            case "cache-first":
                return cacheResult();
            case "cache-and-network":
                return {
                    ...cacheResult(),
                    loading: true,
                    networkStatus: NetworkStatus.loading,
                };
            case "standby":
                return empty;
            default:
                return uninitialized;
        }
    }
    resubscribeCache() {
        const { variables, fetchPolicy } = this.options;
        const query = this.query;
        const shouldUnsubscribe = fetchPolicy === "standby" ||
            fetchPolicy === "no-cache" ||
            this.waitForNetworkResult;
        const shouldResubscribe = !isEqualQuery({ query, variables }, this.unsubscribeFromCache) &&
            !this.waitForNetworkResult;
        if (shouldUnsubscribe || shouldResubscribe) {
            this.unsubscribeFromCache?.();
        }
        if (shouldUnsubscribe || !shouldResubscribe) {
            return;
        }
        const watch = {
            query,
            variables,
            optimistic: true,
            watcher: this,
            callback: (diff) => {
                const info = this.queryManager.getDocumentInfo(query);
                if (info.hasClientExports || info.hasForcedResolvers) {
                    // If this is not set to something different than `diff`, we will
                    // not be notified about future cache changes with an equal `diff`.
                    // That would be the case if we are working with client-only fields
                    // that are forced or with `exports` fields that might change, causing
                    // local resolvers to return a new result.
                    // This is based on an implementation detail of `InMemoryCache`, which
                    // is not optimal - but the only alternative to this would be to
                    // resubscribe to the cache asynchonouly, which would bear the risk of
                    // missing further synchronous updates.
                    watch.lastDiff = undefined;
                }
                if (watch.lastOwnDiff === diff) {
                    // skip cache updates that were caused by our own writes
                    return;
                }
                const { result: previousResult } = this.subject.getValue();
                if (!diff.complete &&
                    // If we are trying to deliver an incomplete cache result, we avoid
                    // reporting it if the query has errored, otherwise we let the broadcast try
                    // and repair the partial result by refetching the query. This check avoids
                    // a situation where a query that errors and another succeeds with
                    // overlapping data does not report the partial data result to the errored
                    // query.
                    //
                    // See https://github.com/apollographql/apollo-client/issues/11400 for more
                    // information on this issue.
                    (previousResult.error ||
                        // Prevent to schedule a notify directly after the `ObservableQuery`
                        // has been `reset` (which will set the `previousResult` to `uninitialized` or `empty`)
                        // as in those cases, `resetCache` will manually call `refetch` with more intentional timing.
                        previousResult === uninitialized ||
                        previousResult === empty)) {
                    return;
                }
                if (!equal(previousResult.data, diff.result)) {
                    this.scheduleNotify();
                }
            },
        };
        const cancelWatch = this.cache.watch(watch);
        this.unsubscribeFromCache = Object.assign(() => {
            this.unsubscribeFromCache = undefined;
            cancelWatch();
        }, { query, variables });
    }
    stableLastResult;
    getCurrentResult() {
        const { result: current } = this.subject.getValue();
        let value = (
        // if the `current` result is in an error state, we will always return that
        // error state, even if we have no observers
        (current.networkStatus === NetworkStatus.error ||
            // if we have observers, we are watching the cache and
            // this.subject.getValue() will always be up to date
            this.hasObservers() || // if we are using a `no-cache` fetch policy in which case this
        // `ObservableQuery` cannot have been updated from the outside - in
        // that case, we prefer to keep the current value
        this.options.fetchPolicy === "no-cache")) ?
            current
            // otherwise, the `current` value might be outdated due to missed
            // external updates - calculate it again
            : this.getInitialResult();
        if (value === uninitialized) {
            value = this.getInitialResult();
        }
        if (!equal(this.stableLastResult, value)) {
            this.stableLastResult = value;
        }
        return this.stableLastResult;
    }
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
    refetch(variables) {
        const { fetchPolicy } = this.options;
        const reobserveOptions = {
            // Always disable polling for refetches.
            pollInterval: 0,
        };
        // Unless the provided fetchPolicy always consults the network
        // (no-cache, network-only, or cache-and-network), override it with
        // network-only to force the refetch for this fetchQuery call.
        if (fetchPolicy === "no-cache") {
            reobserveOptions.fetchPolicy = "no-cache";
        }
        else {
            reobserveOptions.fetchPolicy = "network-only";
        }
        if (__DEV__ && variables && hasOwnProperty.call(variables, "variables")) {
            const queryDef = getQueryDefinition(this.query);
            const vars = queryDef.variableDefinitions;
            if (!vars || !vars.some((v) => v.variable.name.value === "variables")) {
                __DEV__ && invariant.warn(83, variables, queryDef.name?.value || queryDef);
            }
        }
        if (variables && !equal(this.variables, variables)) {
            // Update the existing options with new variables
            reobserveOptions.variables = this.options.variables =
                this.getVariablesWithDefaults({ ...this.variables, ...variables });
        }
        this._lastWrite = undefined;
        return this._reobserve(reobserveOptions, {
            newNetworkStatus: NetworkStatus.refetch,
        });
    }
    fetchMore({ query, variables, context, errorPolicy, updateQuery, }) {
        invariant(
            this.options.fetchPolicy !== "cache-only",
            84,
            getOperationName(this.query, "(anonymous)")
        );
        const combinedOptions = {
            ...compact(this.options, { errorPolicy: "none" }, {
                query,
                context,
                errorPolicy,
            }),
            variables: (query ? variables : ({
                ...this.variables,
                ...variables,
            })),
            // The fetchMore request goes immediately to the network and does
            // not automatically write its result to the cache (hence no-cache
            // instead of network-only), because we allow the caller of
            // fetchMore to provide an updateQuery callback that determines how
            // the data gets written to the cache.
            fetchPolicy: "no-cache",
            notifyOnNetworkStatusChange: this.options.notifyOnNetworkStatusChange,
        };
        combinedOptions.query = this.transformDocument(combinedOptions.query);
        // If a temporary query is passed to `fetchMore`, we don't want to store
        // it as the last query result since it may be an optimized query for
        // pagination. We will however run the transforms on the original document
        // as well as the document passed in `fetchMoreOptions` to ensure the cache
        // uses the most up-to-date document which may rely on runtime conditionals.
        this.lastQuery =
            query ?
                this.transformDocument(this.options.query)
                : combinedOptions.query;
        let wasUpdated = false;
        const isCached = this.options.fetchPolicy !== "no-cache";
        if (!isCached) {
            invariant(updateQuery, 85);
        }
        const { finalize, pushNotification } = this.pushOperation(NetworkStatus.fetchMore);
        pushNotification({
            source: "newNetworkStatus",
            kind: "N",
            value: {},
        }, { shouldEmit: 3 /* EmitBehavior.networkStatusChange */ });
        const { promise, operator } = getTrackingOperatorPromise();
        const { observable } = this.queryManager.fetchObservableWithInfo(combinedOptions, { networkStatus: NetworkStatus.fetchMore, exposeExtensions: true });
        const subscription = observable
            .pipe(operator, filter((notification) => notification.kind === "N" && notification.source === "network"))
            .subscribe({
            next: (notification) => {
                wasUpdated = false;
                const fetchMoreResult = notification.value;
                const extensions = fetchMoreResult[extensionsSymbol];
                if (isNetworkRequestSettled(notification.value.networkStatus)) {
                    finalize();
                }
                if (isCached) {
                    // Separately getting a diff here before the batch - `onWatchUpdated` might be
                    // called with an `undefined` `lastDiff` on the watcher if the cache was just subscribed to.
                    const lastDiff = this.getCacheDiff();
                    // Performing this cache update inside a cache.batch transaction ensures
                    // any affected cache.watch watchers are notified at most once about any
                    // updates. Most watchers will be using the QueryInfo class, which
                    // responds to notifications by calling reobserveCacheFirst to deliver
                    // fetchMore cache results back to this ObservableQuery.
                    this.cache.batch({
                        update: (cache) => {
                            if (updateQuery) {
                                cache.updateQuery({
                                    query: this.query,
                                    variables: this.variables,
                                    returnPartialData: true,
                                    optimistic: false,
                                    extensions,
                                }, (previous) => updateQuery(previous, {
                                    fetchMoreResult: fetchMoreResult.data,
                                    variables: combinedOptions.variables,
                                }));
                            }
                            else {
                                // If we're using a field policy instead of updateQuery, the only
                                // thing we need to do is write the new data to the cache using
                                // combinedOptions.variables (instead of this.variables, which is
                                // what this.updateQuery uses, because it works by abusing the
                                // original field value, keyed by the original variables).
                                cache.writeQuery({
                                    query: combinedOptions.query,
                                    variables: combinedOptions.variables,
                                    data: fetchMoreResult.data,
                                    extensions,
                                });
                            }
                        },
                        onWatchUpdated: (watch, diff) => {
                            if (watch.watcher === this &&
                                !equal(diff.result, lastDiff.result)) {
                                wasUpdated = true;
                                const lastResult = this.getCurrentResult();
                                // Let the cache watch from resubscribeCache handle the final
                                // result
                                if (isNetworkRequestInFlight(fetchMoreResult.networkStatus)) {
                                    pushNotification({
                                        kind: "N",
                                        source: "network",
                                        value: {
                                            ...lastResult,
                                            networkStatus: (fetchMoreResult.networkStatus ===
                                                NetworkStatus.error) ?
                                                NetworkStatus.ready
                                                : fetchMoreResult.networkStatus,
                                            // will be overwritten anyways, just here for types sake
                                            loading: false,
                                            data: diff.result,
                                            dataState: fetchMoreResult.dataState === "streaming" ?
                                                "streaming"
                                                : "complete",
                                        },
                                    });
                                }
                            }
                        },
                    });
                }
                else {
                    // There is a possibility `lastResult` may not be set when
                    // `fetchMore` is called which would cause this to crash. This should
                    // only happen if we haven't previously reported a result. We don't
                    // quite know what the right behavior should be here since this block
                    // of code runs after the fetch result has executed on the network.
                    // We plan to let it crash in the meantime.
                    //
                    // If we get bug reports due to the `data` property access on
                    // undefined, this should give us a real-world scenario that we can
                    // use to test against and determine the right behavior. If we do end
                    // up changing this behavior, this may require, for example, an
                    // adjustment to the types on `updateQuery` since that function
                    // expects that the first argument always contains previous result
                    // data, but not `undefined`.
                    const lastResult = this.getCurrentResult();
                    const data = updateQuery(lastResult.data, {
                        fetchMoreResult: fetchMoreResult.data,
                        variables: combinedOptions.variables,
                    });
                    pushNotification({
                        kind: "N",
                        value: {
                            ...lastResult,
                            networkStatus: NetworkStatus.ready,
                            // will be overwritten anyways, just here for types sake
                            loading: false,
                            data: data,
                            dataState: lastResult.dataState === "streaming" ?
                                "streaming"
                                : "complete",
                        },
                        source: "network",
                    });
                }
            },
        });
        return preventUnhandledRejection(promise
            .then((result) => toQueryResult(this.maskResult(result)))
            .finally(() => {
            subscription.unsubscribe();
            finalize();
            if (isCached && !wasUpdated) {
                const lastResult = this.getCurrentResult();
                if (lastResult.dataState === "streaming") {
                    pushNotification({
                        kind: "N",
                        source: "network",
                        value: {
                            ...lastResult,
                            dataState: "complete",
                            networkStatus: NetworkStatus.ready,
                        },
                    });
                }
                else {
                    pushNotification({
                        kind: "N",
                        source: "newNetworkStatus",
                        value: {},
                    }, { shouldEmit: 1 /* EmitBehavior.force */ });
                }
            }
        }));
    }
    // XXX the subscription variables are separate from the query variables.
    // if you want to update subscription variables, right now you have to do that separately,
    // and you can only do it by stopping the subscription and then subscribing again with new variables.
    /**
     * A function that enables you to execute a [subscription](https://www.apollographql.com/docs/react/data/subscriptions/), usually to subscribe to specific fields that were included in the query.
     *
     * This function returns _another_ function that you can call to terminate the subscription.
     */
    subscribeToMore(options) {
        const subscription = this.queryManager
            .startGraphQLSubscription({
            query: options.document,
            variables: options.variables,
            context: options.context,
        })
            .subscribe({
            next: (subscriptionData) => {
                const { updateQuery, onError } = options;
                const { error } = subscriptionData;
                if (error) {
                    if (onError) {
                        onError(error);
                    }
                    else {
                        invariant.error(86, error);
                    }
                    return;
                }
                if (updateQuery) {
                    this.updateQuery((previous, updateOptions) => updateQuery(previous, {
                        subscriptionData: subscriptionData,
                        ...updateOptions,
                    }));
                }
            },
        });
        this.subscriptions.add(subscription);
        return () => {
            if (this.subscriptions.delete(subscription)) {
                subscription.unsubscribe();
            }
        };
    }
    /**
    * @internal
    * 
    * @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
    */
    applyOptions(newOptions) {
        const mergedOptions = compact(this.options, newOptions || {});
        assign(this.options, mergedOptions);
        this.updatePolling();
    }
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
    async setVariables(variables) {
        variables = this.getVariablesWithDefaults(variables);
        if (equal(this.variables, variables)) {
            // If we have no observers, then we don't actually want to make a network
            // request. As soon as someone observes the query, the request will kick
            // off. For now, we just store any changes. (See #1077)
            return toQueryResult(this.getCurrentResult());
        }
        this.options.variables = variables;
        // See comment above
        if (!this.hasObservers()) {
            return toQueryResult(this.getCurrentResult());
        }
        return this._reobserve({
            // Reset options.fetchPolicy to its original value.
            fetchPolicy: this.options.initialFetchPolicy,
            variables,
        }, { newNetworkStatus: NetworkStatus.setVariables });
    }
    /**
     * A function that enables you to update the query's cached result without executing a followup GraphQL operation.
     *
     * See [using updateQuery and updateFragment](https://www.apollographql.com/docs/react/caching/cache-interaction/#using-updatequery-and-updatefragment) for additional information.
     */
    updateQuery(mapFn) {
        const { queryManager } = this;
        const { result, complete } = this.getCacheDiff({ optimistic: false });
        const newResult = mapFn(result, {
            variables: this.variables,
            complete: !!complete,
            previousData: result,
        });
        if (newResult) {
            this.cache.writeQuery({
                query: this.options.query,
                data: newResult,
                variables: this.variables,
            });
            queryManager.broadcastQueries();
        }
    }
    /**
     * A function that instructs the query to begin re-executing at a specified interval (in milliseconds).
     */
    startPolling(pollInterval) {
        this.options.pollInterval = pollInterval;
        this.updatePolling();
    }
    /**
     * A function that instructs the query to stop polling after a previous call to `startPolling`.
     */
    stopPolling() {
        this.options.pollInterval = 0;
        this.updatePolling();
    }
    // Update options.fetchPolicy according to options.nextFetchPolicy.
    applyNextFetchPolicy(reason, 
    // It's possible to use this method to apply options.nextFetchPolicy to
    // options.fetchPolicy even if options !== this.options, though that happens
    // most often when the options are temporary, used for only one request and
    // then thrown away, so nextFetchPolicy may not end up mattering.
    options) {
        if (options.nextFetchPolicy) {
            const { fetchPolicy = "cache-first", initialFetchPolicy = fetchPolicy } = options;
            if (fetchPolicy === "standby") {
                // Do nothing, leaving options.fetchPolicy unchanged.
            }
            else if (typeof options.nextFetchPolicy === "function") {
                // When someone chooses "cache-and-network" or "network-only" as their
                // initial FetchPolicy, they often do not want future cache updates to
                // trigger unconditional network requests, which is what repeatedly
                // applying the "cache-and-network" or "network-only" policies would
                // seem to imply. Instead, when the cache reports an update after the
                // initial network request, it may be desirable for subsequent network
                // requests to be triggered only if the cache result is incomplete. To
                // that end, the options.nextFetchPolicy option provides an easy way to
                // update options.fetchPolicy after the initial network request, without
                // having to call observableQuery.reobserve.
                options.fetchPolicy = options.nextFetchPolicy.call(options, fetchPolicy, { reason, options, observable: this, initialFetchPolicy });
            }
            else if (reason === "variables-changed") {
                options.fetchPolicy = initialFetchPolicy;
            }
            else {
                options.fetchPolicy = options.nextFetchPolicy;
            }
        }
        return options.fetchPolicy;
    }
    fetch(options, networkStatus, fetchQuery, operator) {
        // TODO Make sure we update the networkStatus (and infer fetchVariables)
        // before actually committing to the fetch.
        const initialFetchPolicy = this.options.fetchPolicy;
        options.context ??= {};
        let synchronouslyEmitted = false;
        const onCacheHit = () => {
            synchronouslyEmitted = true;
        };
        const fetchQueryOperator = // we cannot use `tap` here, since it allows only for a "before subscription"
         
        // hook with `subscribe` and we care for "directly before and after subscription"
        (source) => new Observable((subscriber) => {
            try {
                return source.subscribe({
                    next(value) {
                        synchronouslyEmitted = true;
                        subscriber.next(value);
                    },
                    error: (error) => subscriber.error(error),
                    complete: () => subscriber.complete(),
                });
            }
            finally {
                if (!synchronouslyEmitted) {
                    operation.override = networkStatus;
                    this.input.next({
                        kind: "N",
                        source: "newNetworkStatus",
                        value: {
                            resetError: true,
                        },
                        query,
                        variables,
                        meta: {
                            shouldEmit: 3 /* EmitBehavior.networkStatusChange */,
                            /*
                             * The moment this notification is emitted, `nextFetchPolicy`
                             * might already have switched from a `network-only` to a
                             * `cache-something` policy, so we want to ensure that the
                             * loading state emit doesn't accidentally read from the cache
                             * in those cases.
                             */
                            fetchPolicy: initialFetchPolicy,
                        },
                    });
                }
            }
        });
        let { observable, fromLink } = this.queryManager.fetchObservableWithInfo(options, {
            networkStatus,
            query: fetchQuery,
            onCacheHit,
            fetchQueryOperator,
            observableQuery: this,
        });
        // track query and variables from the start of the operation
        const { query, variables } = this;
        const operation = {
            abort: () => {
                subscription.unsubscribe();
            },
            query,
            variables,
        };
        this.activeOperations.add(operation);
        let forceFirstValueEmit = networkStatus == NetworkStatus.refetch ||
            networkStatus == NetworkStatus.setVariables;
        observable = observable.pipe(operator, share());
        const subscription = observable
            .pipe(tap({
            next: (notification) => {
                if (notification.source === "newNetworkStatus" ||
                    (notification.kind === "N" && notification.value.loading)) {
                    operation.override = networkStatus;
                }
                else {
                    delete operation.override;
                }
            },
            finalize: () => this.activeOperations.delete(operation),
        }))
            .subscribe({
            next: (value) => {
                const meta = {};
                if (forceFirstValueEmit &&
                    value.kind === "N" &&
                    "loading" in value.value &&
                    !value.value.loading) {
                    forceFirstValueEmit = false;
                    meta.shouldEmit = 1 /* EmitBehavior.force */;
                }
                this.input.next({ ...value, query, variables, meta });
            },
        });
        return { fromLink, subscription, observable };
    }
    // Turns polling on or off based on this.options.pollInterval.
    didWarnCacheOnlyPolling = false;
    updatePolling() {
        // Avoid polling in SSR mode
        if (this.queryManager.ssrMode) {
            return;
        }
        const { pollingInfo, options: { fetchPolicy, pollInterval }, } = this;
        const shouldCancelPolling = () => {
            const { options } = this;
            return (!options.pollInterval ||
                !this.hasObservers() ||
                options.fetchPolicy === "cache-only" ||
                options.fetchPolicy === "standby");
        };
        if (shouldCancelPolling()) {
            if (__DEV__) {
                if (!this.didWarnCacheOnlyPolling &&
                    pollInterval &&
                    fetchPolicy === "cache-only") {
                    __DEV__ && invariant.warn(87, getOperationName(this.query, "(anonymous)"));
                    this.didWarnCacheOnlyPolling = true;
                }
            }
            this.cancelPolling();
            return;
        }
        if (pollingInfo?.interval === pollInterval) {
            return;
        }
        const info = pollingInfo || (this.pollingInfo = {});
        info.interval = pollInterval;
        const maybeFetch = () => {
            // defense against options changing after the setTimeout changes in case
            // the call site forgets to call cancelPolling
            if (shouldCancelPolling()) {
                return this.cancelPolling();
            }
            if (this.pollingInfo) {
                if (!isNetworkRequestInFlight(this.networkStatus) &&
                    !this.options.skipPollAttempt?.()) {
                    this._reobserve({
                        // Most fetchPolicy options don't make sense to use in a polling context, as
                        // users wouldn't want to be polling the cache directly. However, network-only and
                        // no-cache are both useful for when the user wants to control whether or not the
                        // polled results are written to the cache.
                        fetchPolicy: this.options.initialFetchPolicy === "no-cache" ?
                            "no-cache"
                            : "network-only",
                    }, {
                        newNetworkStatus: NetworkStatus.poll,
                    }).then(poll, poll);
                }
                else {
                    poll();
                }
            }
        };
        const poll = () => {
            const info = this.pollingInfo;
            if (info) {
                clearTimeout(info.timeout);
                info.timeout = setTimeout(maybeFetch, info.interval);
            }
        };
        poll();
    }
    // This differs from stopPolling in that it does not set pollInterval to 0
    cancelPolling() {
        if (this.pollingInfo) {
            clearTimeout(this.pollingInfo.timeout);
            delete this.pollingInfo;
        }
    }
    /**
     * Reevaluate the query, optionally against new options. New options will be
     * merged with the current options when given.
     *
     * Note: `variables` can be reset back to their defaults (typically empty) by calling `reobserve` with
     * `variables: undefined`.
     */
    reobserve(newOptions) {
        return this._reobserve(newOptions);
    }
    _reobserve(newOptions, internalOptions) {
        this.isTornDown = false;
        let { newNetworkStatus } = internalOptions || {};
        this.queryManager.obsQueries.add(this);
        const useDisposableObservable = 
        // Refetching uses a disposable Observable to allow refetches using different
        // options, without permanently altering the options of the
        // original ObservableQuery.
        newNetworkStatus === NetworkStatus.refetch ||
            // Polling uses a disposable Observable so the polling options (which force
            // fetchPolicy to be "network-only" or "no-cache") won't override the original options.
            newNetworkStatus === NetworkStatus.poll;
        // Save the old variables, since Object.assign may modify them below.
        const oldVariables = this.variables;
        const oldFetchPolicy = this.options.fetchPolicy;
        const mergedOptions = compact(this.options, newOptions || {});
        // This request will hit the network, so even if there are no variables,
        // we now know that's intentional. (see #12996)
        // Even if that happens only once, we want `variablesUnknown` to stay false permanently.
        this.variablesUnknown &&= mergedOptions.fetchPolicy === "standby";
        const options = useDisposableObservable ?
            // Disposable Observable fetches receive a shallow copy of this.options
            // (merged with newOptions), leaving this.options unmodified.
            mergedOptions
            : assign(this.options, mergedOptions);
        // Don't update options.query with the transformed query to avoid
        // overwriting this.options.query when we aren't using a disposable concast.
        // We want to ensure we can re-run the custom document transforms the next
        // time a request is made against the original query.
        const query = this.transformDocument(options.query);
        this.lastQuery = query;
        // Reevaluate variables to allow resetting variables with variables: undefined,
        // otherwise `compact` will ignore the `variables` key in `newOptions`. We
        // do this after we run the query transform to ensure we get default
        // variables from the transformed query.
        //
        // Note: updating options.variables may mutate this.options.variables
        // in the case of a non-disposable query. This is intentional.
        if (newOptions && "variables" in newOptions) {
            options.variables = this.getVariablesWithDefaults(newOptions.variables);
        }
        if (!useDisposableObservable) {
            // We can skip calling updatePolling if we're not changing this.options.
            this.updatePolling();
            // Reset options.fetchPolicy to its original value when variables change,
            // unless a new fetchPolicy was provided by newOptions.
            if (newOptions &&
                newOptions.variables &&
                !equal(newOptions.variables, oldVariables) &&
                // Don't mess with the fetchPolicy if it's currently "standby".
                options.fetchPolicy !== "standby" &&
                // If we're changing the fetchPolicy anyway, don't try to change it here
                // using applyNextFetchPolicy. The explicit options.fetchPolicy wins.
                (options.fetchPolicy === oldFetchPolicy ||
                    // A `nextFetchPolicy` function has even higher priority, though,
                    // so in that case `applyNextFetchPolicy` must be called.
                    typeof options.nextFetchPolicy === "function")) {
                // This might mutate options.fetchPolicy
                this.applyNextFetchPolicy("variables-changed", options);
                if (newNetworkStatus === void 0) {
                    newNetworkStatus = NetworkStatus.setVariables;
                }
            }
        }
        const oldNetworkStatus = this.networkStatus;
        if (!newNetworkStatus) {
            newNetworkStatus = NetworkStatus.loading;
            if (oldNetworkStatus !== NetworkStatus.loading &&
                newOptions?.variables &&
                !equal(newOptions.variables, oldVariables)) {
                newNetworkStatus = NetworkStatus.setVariables;
            }
            // QueryManager does not emit any values for standby fetch policies so we
            // want ensure that the networkStatus remains ready.
            if (options.fetchPolicy === "standby") {
                newNetworkStatus = NetworkStatus.ready;
            }
        }
        if (options.fetchPolicy === "standby") {
            this.cancelPolling();
        }
        this.resubscribeCache();
        const { promise, operator: promiseOperator } = getTrackingOperatorPromise(
        // This default value should only be used when using a `fetchPolicy` of
        // `standby` since that fetch policy completes without emitting a
        // result. Since we are converting this to a QueryResult type, we
        // omit the extra fields from ApolloQueryResult in the default value.
        options.fetchPolicy === "standby" ?
            { data: undefined }
            : undefined);
        const { subscription, observable, fromLink } = this.fetch(options, newNetworkStatus, query, promiseOperator);
        if (!useDisposableObservable && (fromLink || !this.linkSubscription)) {
            if (this.linkSubscription) {
                this.linkSubscription.unsubscribe();
            }
            this.linkSubscription = subscription;
        }
        const ret = Object.assign(preventUnhandledRejection(promise
            .then((result) => toQueryResult(this.maskResult(result)))
            .finally(() => {
            if (!this.hasObservers() && this.activeOperations.size === 0) {
                // If `reobserve` was called on a query without any observers,
                // the teardown logic would never be called, so we need to
                // call it here to ensure the query is properly torn down.
                this.tearDownQuery();
            }
        })), {
            retain: () => {
                const subscription = observable.subscribe({});
                const unsubscribe = () => subscription.unsubscribe();
                promise.then(unsubscribe, unsubscribe);
                return ret;
            },
        });
        return ret;
    }
    hasObservers() {
        return this.subject.observed;
    }
    /**
     * Tears down the `ObservableQuery` and stops all active operations by sending a `complete` notification.
     */
    stop() {
        this.subject.complete();
        this.initializeObservablesQueue();
        this.tearDownQuery();
    }
    tearDownQuery() {
        if (this.isTornDown)
            return;
        this.resetNotifications();
        this.unsubscribeFromCache?.();
        if (this.linkSubscription) {
            this.linkSubscription.unsubscribe();
            delete this.linkSubscription;
        }
        this.stopPolling();
        // stop all active GraphQL subscriptions
        this.subscriptions.forEach((sub) => sub.unsubscribe());
        this.subscriptions.clear();
        this.queryManager.obsQueries.delete(this);
        this.isTornDown = true;
        this.abortActiveOperations();
        this._lastWrite = undefined;
    }
    transformDocument(document) {
        return this.queryManager.transform(document);
    }
    maskResult(result) {
        const masked = this.queryManager.maskOperation({
            document: this.query,
            data: result.data,
            fetchPolicy: this.options.fetchPolicy,
            cause: this,
        });
        // Maintain object identity as much as possible
        return masked === result.data ? result : { ...result, data: masked };
    }
    dirty = false;
    notifyTimeout;
    /**
    * @internal
    * 
    * @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
    */
    resetNotifications() {
        if (this.notifyTimeout) {
            clearTimeout(this.notifyTimeout);
            this.notifyTimeout = void 0;
        }
        this.dirty = false;
    }
    /**
    * @internal
    * 
    * @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
    */
    scheduleNotify() {
        if (this.dirty)
            return;
        this.dirty = true;
        if (!this.notifyTimeout) {
            this.notifyTimeout = setTimeout(() => this.notify(true), 0);
        }
    }
    /**
    * @internal
    * 
    * @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
    */
    notify(scheduled = false) {
        if (!scheduled) {
            // For queries with client exports or forced resolvers, we don't want to
            // synchronously reobserve the cache on broadcast,
            // but actually wait for the `scheduleNotify` timeout triggered by the
            // `cache.watch` callback from `resubscribeCache`.
            const info = this.queryManager.getDocumentInfo(this.query);
            if (info.hasClientExports || info.hasForcedResolvers) {
                return;
            }
        }
        const { dirty } = this;
        this.resetNotifications();
        if (dirty &&
            (this.options.fetchPolicy === "cache-only" ||
                this.options.fetchPolicy === "cache-and-network" ||
                !this.activeOperations.size)) {
            const diff = this.getCacheDiff();
            if (
            // `fromOptimisticTransaction` is not available through the `cache.diff`
            // code path, so we need to check it this way
            equal(diff.result, this.getCacheDiff({ optimistic: false }).result)) {
                //If this diff did not come from an optimistic transaction
                // make the ObservableQuery "reobserve" the latest data
                // using a temporary fetch policy of "cache-first", so complete cache
                // results have a chance to be delivered without triggering additional
                // network requests, even when options.fetchPolicy is "network-only"
                // or "cache-and-network". All other fetch policies are preserved by
                // this method, and are handled by calling oq.reobserve(). If this
                // reobservation is spurious, distinctUntilChanged still has a
                // chance to catch it before delivery to ObservableQuery subscribers.
                this.reobserveCacheFirst();
            }
            else {
                // If this diff came from an optimistic transaction, deliver the
                // current cache data to the ObservableQuery, but don't perform a
                // reobservation, since oq.reobserveCacheFirst might make a network
                // request, and we never want to trigger network requests in the
                // middle of optimistic updates.
                this.input.next({
                    kind: "N",
                    value: {
                        data: diff.result,
                        dataState: diff.complete ? "complete"
                            : diff.result ? "partial"
                                : "empty",
                        networkStatus: NetworkStatus.ready,
                        loading: false,
                        error: undefined,
                        partial: !diff.complete,
                    },
                    source: "cache",
                    query: this.query,
                    variables: this.variables,
                    meta: {},
                });
            }
        }
    }
    activeOperations = new Set();
    pushOperation(networkStatus) {
        let aborted = false;
        // track query and variables from the start of the operation
        const { query, variables } = this;
        const finalize = () => {
            this.activeOperations.delete(operation);
        };
        const operation = {
            override: networkStatus,
            abort: () => {
                aborted = true;
                finalize();
            },
            query,
            variables,
        };
        this.activeOperations.add(operation);
        return {
            finalize,
            pushNotification: (notification, additionalMeta) => {
                if (!aborted) {
                    this.input.next({
                        ...notification,
                        query,
                        variables,
                        meta: { ...additionalMeta },
                    });
                }
            },
        };
    }
    calculateNetworkStatus(baseNetworkStatus) {
        if (baseNetworkStatus === NetworkStatus.streaming) {
            return baseNetworkStatus;
        }
        // in the future, this could be more complex logic, e.g. "refetch" and
        // "fetchMore" having priority over "polling" or "loading" network statuses
        // as for now we just take the "latest" operation that is still active,
        // as that lines up best with previous behavior[]
        const operation = Array.from(this.activeOperations.values())
            .reverse()
            .find((operation) => isEqualQuery(operation, this) && operation.override !== undefined);
        return operation?.override ?? baseNetworkStatus;
    }
    abortActiveOperations() {
        this.activeOperations.forEach((operation) => operation.abort());
    }
    /**
    * @internal
    * Called from `clearStore`.
    *
    * - resets the query to its initial state
    * - cancels all active operations and their subscriptions
    * 
    * @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
    */
    reset() {
        // exception for cache-only queries - we reset them into a "ready" state
        // as we won't trigger a refetch for them
        const resetToEmpty = this.options.fetchPolicy === "cache-only";
        this.setResult(resetToEmpty ? empty : uninitialized, {
            shouldEmit: resetToEmpty ? 1 /* EmitBehavior.force */ : 2 /* EmitBehavior.never */,
        });
        this.abortActiveOperations();
    }
    /**
    * @internal
    * 
    * @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
    */
    setResult(result, additionalMeta) {
        this.input.next({
            source: "setResult",
            kind: "N",
            value: result,
            query: this.query,
            variables: this.variables,
            meta: { ...additionalMeta },
        });
    }
    operator = filterMap((notification) => {
        const { query, variables, meta } = notification;
        if (notification.source === "setResult") {
            return { query, variables, result: notification.value, meta };
        }
        if (notification.kind === "C" || !isEqualQuery(notification, this)) {
            return;
        }
        let result;
        const previous = this.subject.getValue();
        if (notification.source === "cache") {
            result = notification.value;
            if (result.networkStatus === NetworkStatus.ready &&
                result.partial &&
                (!this.options.returnPartialData ||
                    previous.result.networkStatus === NetworkStatus.error) &&
                this.options.fetchPolicy !== "cache-only") {
                return;
            }
        }
        else if (notification.source === "network") {
            if (this.waitForNetworkResult) {
                this.waitForNetworkResult = false;
                this.resubscribeCache();
            }
            result =
                notification.kind === "E" ?
                    {
                        ...(isEqualQuery(previous, notification) ?
                            previous.result
                            : { data: undefined, dataState: "empty", partial: true }),
                        error: notification.error,
                        networkStatus: NetworkStatus.error,
                        loading: false,
                    }
                    : notification.value;
            if (notification.kind === "E" && result.dataState === "streaming") {
                result.dataState = "complete";
            }
            if (result.error) {
                meta.shouldEmit = 1 /* EmitBehavior.force */;
            }
        }
        else if (notification.source === "newNetworkStatus") {
            const baseResult = isEqualQuery(previous, notification) ?
                previous.result
                : this.getInitialResult(meta.fetchPolicy);
            const { resetError } = notification.value;
            const error = resetError ? undefined : baseResult.error;
            const networkStatus = error ? NetworkStatus.error : NetworkStatus.ready;
            result = {
                ...baseResult,
                error,
                networkStatus,
            };
        }
        // every code path until here should have either returned or set a result,
        // but typescript needs a little help
        invariant(result);
        // normalize result shape
        if (!result.error)
            delete result.error;
        result.networkStatus = this.calculateNetworkStatus(result.networkStatus);
        result.loading = isNetworkRequestInFlight(result.networkStatus);
        result = this.maskResult(result);
        // Preserve referential equality of masked data when the new masked
        // result is deeply equal to the previous one. This prevents React hooks
        // like `useMemo` or `useEffect` from firing unnecessarily.
        if (previous.result.data !== undefined &&
            result.data !== previous.result.data &&
            equal(result.data, previous.result.data)) {
            result.data = previous.result.data;
        }
        return { query, variables, result, meta };
    });
    // Reobserve with fetchPolicy effectively set to "cache-first", triggering
    // delivery of any new data from the cache, possibly falling back to the network
    // if any cache data are missing. This allows _complete_ cache results to be
    // delivered without also kicking off unnecessary network requests when
    // this.options.fetchPolicy is "cache-and-network" or "network-only". When
    // this.options.fetchPolicy is any other policy ("cache-first", "cache-only",
    // "standby", or "no-cache"), we call this.reobserve() as usual.
    reobserveCacheFirst() {
        const { fetchPolicy, nextFetchPolicy } = this.options;
        if (fetchPolicy === "cache-and-network" || fetchPolicy === "network-only") {
            this.reobserve({
                fetchPolicy: "cache-first",
                // Use a temporary nextFetchPolicy function that replaces itself with the
                // previous nextFetchPolicy value and returns the original fetchPolicy.
                nextFetchPolicy(currentFetchPolicy, context) {
                    // Replace this nextFetchPolicy function in the options object with the
                    // original this.options.nextFetchPolicy value.
                    this.nextFetchPolicy = nextFetchPolicy;
                    // If the original nextFetchPolicy value was a function, give it a
                    // chance to decide what happens here.
                    if (typeof this.nextFetchPolicy === "function") {
                        return this.nextFetchPolicy(currentFetchPolicy, context);
                    }
                    // Otherwise go back to the original this.options.fetchPolicy.
                    return fetchPolicy;
                },
            });
        }
        else {
            this.reobserve();
        }
    }
    getVariablesWithDefaults(variables) {
        return this.queryManager.getVariables(this.query, variables);
    }
}
export function logMissingFieldErrors(missing) {
    if (__DEV__ && missing) {
        __DEV__ && invariant.debug(88, missing);
    }
}
function isEqualQuery(a, b) {
    return !!(a && b && a.query === b.query && equal(a.variables, b.variables));
}
function getTrackingOperatorPromise(defaultValue) {
    let lastValue = defaultValue, resolve, reject;
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    const operator = tap({
        next(value) {
            if (value.kind === "E") {
                return reject(value.error);
            }
            if (value.kind === "N" &&
                value.source !== "newNetworkStatus" &&
                !value.value.loading) {
                lastValue = value.value;
            }
        },
        finalize: () => {
            if (lastValue) {
                resolve(lastValue);
            }
            else {
                const message = "The operation was aborted.";
                const name = "AbortError";
                reject(typeof DOMException !== "undefined" ?
                    new DOMException(message, name)
                    // some environments do not have `DOMException`, e.g. node
                    // uses a normal `Error` with a `name` property instead: https://github.com/phryneas/node/blob/d0579b64f0f6b722f8e49bf8a471dd0d0604a21e/lib/internal/errors.js#L964
                    // error.code is a legacy property that is not used anymore,
                    // and also inconsistent across environments (in supporting
                    // browsers it is `20`, in node `'ABORT_ERR'`) so we omit that.
                    : Object.assign(new Error(message), { name }));
            }
        },
    });
    return { promise, operator };
}
//# sourceMappingURL=ObservableQuery.js.map
