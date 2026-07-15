"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryInfo = void 0;
const equality_1 = require("@wry/equality");
const internal_1 = require("@apollo/client/utilities/internal");
const invariant_1 = require("@apollo/client/utilities/invariant");
const IGNORE = {};
const destructiveMethodCounts = new WeakMap();
function wrapDestructiveCacheMethod(cache, methodName) {
    const original = cache[methodName];
    if (typeof original === "function") {
        // @ts-expect-error this is just too generic to be typed correctly
        cache[methodName] = function () {
            destructiveMethodCounts.set(cache, 
            // The %1e15 allows the count to wrap around to 0 safely every
            // quadrillion evictions, so there's no risk of overflow. To be
            // clear, this is more of a pedantic principle than something
            // that matters in any conceivable practical scenario.
            (destructiveMethodCounts.get(cache) + 1) % 1e15);
            // @ts-expect-error this is just too generic to be typed correctly
            return original.apply(this, arguments);
        };
    }
}
const queryInfoIds = new WeakMap();
// A QueryInfo object represents a single network request, either initiated
// from the QueryManager or from an ObservableQuery.
// It will only ever be used for a single network call.
// It is responsible for reporting results to the cache, merging and in a no-cache
// scenario accumulating the response.
class QueryInfo {
    // TODO remove soon - this should be able to be handled by cancelling old operations before starting new ones
    lastRequestId = 1;
    cache;
    queryManager;
    id;
    observableQuery;
    incremental;
    constructor(queryManager, observableQuery) {
        const cache = (this.cache = queryManager.cache);
        const id = (queryInfoIds.get(queryManager) || 0) + 1;
        queryInfoIds.set(queryManager, id);
        this.id = id + "";
        this.observableQuery = observableQuery;
        this.queryManager = queryManager;
        // Track how often cache.evict is called, since we want eviction to
        // override the feud-stopping logic in the markQueryResult method, by
        // causing shouldWrite to return true. Wrapping the cache.evict method
        // is a bit of a hack, but it saves us from having to make eviction
        // counting an official part of the ApolloCache API.
        if (!destructiveMethodCounts.has(cache)) {
            destructiveMethodCounts.set(cache, 0);
            wrapDestructiveCacheMethod(cache, "evict");
            wrapDestructiveCacheMethod(cache, "modify");
            wrapDestructiveCacheMethod(cache, "reset");
        }
    }
    /**
    * @internal
    * For feud-preventing behaviour, `lastWrite` should be shared by all `QueryInfo` instances of an `ObservableQuery`.
    * In the case of a standalone `QueryInfo`, we will keep a local version.
    * 
    * @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
    */
    _lastWrite;
    get lastWrite() {
        return (this.observableQuery || this)._lastWrite;
    }
    set lastWrite(value) {
        (this.observableQuery || this)._lastWrite = value;
    }
    resetLastWrite() {
        this.lastWrite = void 0;
    }
    shouldWrite(result, variables) {
        const { lastWrite } = this;
        return !(lastWrite &&
            // If cache.evict has been called since the last time we wrote this
            // data into the cache, there's a chance writing this result into
            // the cache will repair what was evicted.
            lastWrite.dmCount === destructiveMethodCounts.get(this.cache) &&
            (0, equality_1.equal)(variables, lastWrite.variables) &&
            (0, equality_1.equal)(result.data, lastWrite.result.data) &&
            // We have to compare these values because its possible the final chunk
            // emitted in the incremental result is just `hasNext: false`. This
            // ensures we trigger a cache write when we get `isLastChunk: true`.
            result.extensions?.[internal_1.streamInfoSymbol] ===
                lastWrite.result.extensions?.[internal_1.streamInfoSymbol]);
    }
    get hasNext() {
        return this.incremental ? this.incremental.hasNext : false;
    }
    maybeHandleIncrementalResult(cacheData, incoming, query) {
        const { incrementalHandler } = this.queryManager;
        if (incrementalHandler.isIncrementalResult(incoming)) {
            this.incremental ||= incrementalHandler.startRequest({
                query,
            });
            return this.incremental.handle(cacheData, incoming);
        }
        return incoming;
    }
    markQueryResult(incoming, { document: query, variables, errorPolicy, cacheWriteBehavior, }) {
        const diffOptions = {
            query,
            variables,
            returnPartialData: true,
            optimistic: true,
        };
        // Cancel the pending notify timeout (if it exists) to prevent extraneous network
        // requests. To allow future notify timeouts, diff and dirty are reset as well.
        this.observableQuery?.["resetNotifications"]();
        const skipCache = cacheWriteBehavior === 0 /* CacheWriteBehavior.FORBID */;
        const lastDiff = skipCache ? undefined : this.cache.diff(diffOptions);
        let result = this.maybeHandleIncrementalResult(lastDiff?.result, incoming, query);
        if (skipCache) {
            return result;
        }
        if (shouldWriteResult(result, errorPolicy)) {
            // Using a transaction here so we have a chance to read the result
            // back from the cache before the watch callback fires as a result
            // of writeQuery, so we can store the new diff quietly and ignore
            // it when we receive it redundantly from the watch callback.
            this.cache.batch({
                onWatchUpdated: (
                // all additional options on ObservableQuery.CacheWatchOptions are
                // optional so we can use the type here
                watch, diff) => {
                    if (watch.watcher === this.observableQuery) {
                        // see comment on `lastOwnDiff` for explanation
                        watch.lastOwnDiff = diff;
                    }
                },
                update: (cache) => {
                    if (this.shouldWrite(result, variables)) {
                        cache.writeQuery({
                            query,
                            data: result.data,
                            variables,
                            overwrite: cacheWriteBehavior === 1 /* CacheWriteBehavior.OVERWRITE */,
                            extensions: result.extensions,
                        });
                        this.lastWrite = {
                            result,
                            variables,
                            dmCount: destructiveMethodCounts.get(this.cache),
                        };
                    }
                    else {
                        // If result is the same as the last result we received from
                        // the network (and the variables match too), avoid writing
                        // result into the cache again. The wisdom of skipping this
                        // cache write is far from obvious, since any cache write
                        // could be the one that puts the cache back into a desired
                        // state, fixing corruption or missing data. However, if we
                        // always write every network result into the cache, we enable
                        // feuds between queries competing to update the same data in
                        // incompatible ways, which can lead to an endless cycle of
                        // cache broadcasts and useless network requests. As with any
                        // feud, eventually one side must step back from the brink,
                        // letting the other side(s) have the last word(s). There may
                        // be other points where we could break this cycle, such as
                        // silencing the broadcast for cache.writeQuery (not a good
                        // idea, since it just delays the feud a bit) or somehow
                        // avoiding the network request that just happened (also bad,
                        // because the server could return useful new data). All
                        // options considered, skipping this cache write seems to be
                        // the least damaging place to break the cycle, because it
                        // reflects the intuition that we recently wrote this exact
                        // result into the cache, so the cache *should* already/still
                        // contain this data. If some other query has clobbered that
                        // data in the meantime, that's too bad, but there will be no
                        // winners if every query blindly reverts to its own version
                        // of the data. This approach also gives the network a chance
                        // to return new data, which will be written into the cache as
                        // usual, notifying only those queries that are directly
                        // affected by the cache updates, as usual. In the future, an
                        // even more sophisticated cache could perhaps prevent or
                        // mitigate the clobbering somehow, but that would make this
                        // particular cache write even less important, and thus
                        // skipping it would be even safer than it is today.
                        if (lastDiff && lastDiff.complete) {
                            // Reuse data from the last good (complete) diff that we
                            // received, when possible.
                            result = { ...result, data: lastDiff.result };
                            return;
                        }
                        // If the previous this.diff was incomplete, fall through to
                        // re-reading the latest data with cache.diff, below.
                    }
                    const diff = cache.diff(diffOptions);
                    // If we're allowed to write to the cache, and we can read a
                    // complete result from the cache, update result.data to be the
                    // result from the cache, rather than the raw network result.
                    // Set without setDiff to avoid triggering a notify call, since
                    // we have other ways of notifying for this result.
                    if (diff.complete) {
                        result = { ...result, data: diff.result };
                    }
                },
            });
        }
        else {
            this.lastWrite = void 0;
        }
        return result;
    }
    markMutationResult(incoming, mutation, cache = this.cache) {
        const cacheWrites = [];
        const skipCache = mutation.cacheWriteBehavior === 0 /* CacheWriteBehavior.FORBID */;
        let result = this.maybeHandleIncrementalResult(skipCache ? undefined : (cache.diff({
            id: "ROOT_MUTATION",
            // The cache complains if passed a mutation where it expects a
            // query, so we transform mutations and subscriptions to queries
            // (only once, thanks to this.transformCache).
            query: this.queryManager.getDocumentInfo(mutation.document).asQuery,
            variables: mutation.variables,
            optimistic: false,
            returnPartialData: true,
        }).result), incoming, mutation.document);
        if (mutation.errorPolicy === "ignore") {
            result = { ...result, errors: [] };
        }
        if ((0, internal_1.graphQLResultHasError)(result) && mutation.errorPolicy === "none") {
            return Promise.resolve(result);
        }
        const getResultWithDataState = () => ({
            ...result,
            dataState: this.hasNext ? "streaming" : "complete",
        });
        if (!skipCache && shouldWriteResult(result, mutation.errorPolicy)) {
            cacheWrites.push({
                result: result.data,
                dataId: "ROOT_MUTATION",
                query: mutation.document,
                variables: mutation.variables,
                extensions: result.extensions,
            });
            const { updateQueries } = mutation;
            if (updateQueries) {
                this.queryManager
                    .getObservableQueries("all")
                    .forEach((observableQuery) => {
                    const queryName = observableQuery && observableQuery.queryName;
                    if (!queryName ||
                        !Object.hasOwnProperty.call(updateQueries, queryName)) {
                        return;
                    }
                    const updater = updateQueries[queryName];
                    const { query: document, variables } = observableQuery;
                    // Read the current query result from the store.
                    const { result: currentQueryResult, complete } = observableQuery.getCacheDiff({ optimistic: false });
                    if (complete && currentQueryResult) {
                        // Run our reducer using the current query result and the mutation result.
                        const nextQueryResult = updater(currentQueryResult, {
                            mutationResult: getResultWithDataState(),
                            queryName: (document && (0, internal_1.getOperationName)(document)) || void 0,
                            queryVariables: variables,
                        });
                        // Write the modified result back into the store if we got a new result.
                        if (nextQueryResult) {
                            cacheWrites.push({
                                result: nextQueryResult,
                                dataId: "ROOT_QUERY",
                                query: document,
                                variables,
                            });
                        }
                    }
                });
            }
        }
        let refetchQueries = mutation.refetchQueries;
        if (typeof refetchQueries === "function") {
            refetchQueries = refetchQueries(getResultWithDataState());
        }
        if (cacheWrites.length > 0 ||
            (refetchQueries || "").length > 0 ||
            mutation.update ||
            mutation.onQueryUpdated ||
            mutation.removeOptimistic) {
            const results = [];
            this.queryManager
                .refetchQueries({
                updateCache: (cache) => {
                    if (!skipCache) {
                        cacheWrites.forEach((write) => cache.write(write));
                    }
                    // If the mutation has some writes associated with it then we need to
                    // apply those writes to the store by running this reducer again with
                    // a write action.
                    const { update } = mutation;
                    // Determine whether result is a SingleExecutionResult,
                    // or the final ExecutionPatchResult.
                    if (update) {
                        if (!skipCache) {
                            // Re-read the ROOT_MUTATION data we just wrote into the cache
                            // (the first cache.write call in the cacheWrites.forEach loop
                            // above), so field read functions have a chance to run for
                            // fields within mutation result objects.
                            const diff = cache.diff({
                                id: "ROOT_MUTATION",
                                // The cache complains if passed a mutation where it expects a
                                // query, so we transform mutations and subscriptions to queries
                                // (only once, thanks to this.transformCache).
                                query: this.queryManager.getDocumentInfo(mutation.document)
                                    .asQuery,
                                variables: mutation.variables,
                                optimistic: false,
                                returnPartialData: true,
                            });
                            if (diff.complete) {
                                result = {
                                    ...result,
                                    data: diff.result,
                                };
                            }
                        }
                        // If we've received the whole response, call the update function.
                        if (!this.hasNext) {
                            update(cache, result, {
                                context: mutation.context,
                                variables: mutation.variables,
                            });
                        }
                    }
                    // TODO Do this with cache.evict({ id: 'ROOT_MUTATION' }) but make it
                    // shallow to allow rolling back optimistic evictions.
                    if (!skipCache && !mutation.keepRootFields && !this.hasNext) {
                        cache.modify({
                            id: "ROOT_MUTATION",
                            fields(value, { fieldName, DELETE }) {
                                return fieldName === "__typename" ? value : DELETE;
                            },
                        });
                    }
                },
                include: refetchQueries,
                // Write the final mutation.result to the root layer of the cache.
                optimistic: false,
                // Remove the corresponding optimistic layer at the same time as we
                // write the final non-optimistic result.
                removeOptimistic: mutation.removeOptimistic,
                // Let the caller of client.mutate optionally determine the refetching
                // behavior for watched queries after the mutation.update function runs.
                // If no onQueryUpdated function was provided for this mutation, pass
                // null instead of undefined to disable the default refetching behavior.
                onQueryUpdated: mutation.onQueryUpdated || null,
            })
                .forEach((result) => results.push(result));
            if (mutation.awaitRefetchQueries || mutation.onQueryUpdated) {
                // Returning a promise here makes the mutation await that promise, so we
                // include results in that promise's work if awaitRefetchQueries or an
                // onQueryUpdated function was specified.
                return Promise.all(results).then(() => result);
            }
        }
        return Promise.resolve(result);
    }
    markMutationOptimistic(optimisticResponse, mutation) {
        const data = typeof optimisticResponse === "function" ?
            optimisticResponse(mutation.variables, { IGNORE })
            : optimisticResponse;
        if (data === IGNORE) {
            return false;
        }
        this.cache.recordOptimisticTransaction((cache) => {
            try {
                this.markMutationResult({ data }, mutation, cache);
            }
            catch (error) {
                invariant_1.invariant.error(error);
            }
        }, this.id);
        return true;
    }
    markSubscriptionResult(result, { document, variables, errorPolicy, cacheWriteBehavior, }) {
        if (cacheWriteBehavior !== 0 /* CacheWriteBehavior.FORBID */) {
            if (shouldWriteResult(result, errorPolicy)) {
                this.cache.write({
                    query: document,
                    result: result.data,
                    dataId: "ROOT_SUBSCRIPTION",
                    variables: variables,
                    extensions: result.extensions,
                });
            }
            this.queryManager.broadcastQueries();
        }
    }
}
exports.QueryInfo = QueryInfo;
function shouldWriteResult(result, errorPolicy = "none") {
    const ignoreErrors = errorPolicy === "ignore" || errorPolicy === "all";
    let writeWithErrors = !(0, internal_1.graphQLResultHasError)(result);
    if (!writeWithErrors && ignoreErrors && result.data) {
        writeWithErrors = true;
    }
    return writeWithErrors;
}
//# sourceMappingURL=QueryInfo.cjs.map
