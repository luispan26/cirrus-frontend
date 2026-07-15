import { WeakCache } from "@wry/caches";
import { equal } from "@wry/equality";
import { Trie } from "@wry/trie";
import { wrap } from "optimism";
import { distinctUntilChanged, map, Observable, ReplaySubject, share, shareReplay, tap, timer, } from "rxjs";
import { cacheSizes, canonicalStringify } from "@apollo/client/utilities";
import { __DEV__ } from "@apollo/client/utilities/environment";
import { bindCacheKey, combineLatestBatched, equalByQuery, getApolloCacheMemoryInternals, getFragmentDefinition, getFragmentQueryDocument, mapObservableFragmentMemoized, } from "@apollo/client/utilities/internal";
import { invariant } from "@apollo/client/utilities/invariant";
export class ApolloCache {
    assumeImmutableResults = false;
    // Function used to lookup a fragment when a fragment definition is not part
    // of the GraphQL document. This is useful for caches, such as InMemoryCache,
    // that register fragments ahead of time so they can be referenced by name.
    lookupFragment(fragmentName) {
        return null;
    }
    // Transactional API
    /**
     * Executes multiple cache operations as a single batch, ensuring that
     * watchers are only notified once after all operations complete. This is
     * useful for improving performance when making multiple cache updates, as it
     * prevents unnecessary re-renders or query refetches between individual
     * operations.
     *
     * The `batch` method supports both optimistic and non-optimistic updates, and
     * provides fine-grained control over which cache layer receives the updates
     * and when watchers are notified.
     *
     * For usage instructions, see [Interacting with cached data: `cache.batch`](https://www.apollographql.com/docs/react/caching/cache-interaction#using-cachebatch).
     *
     * @example
     *
     * ```js
     * cache.batch({
     *   update(cache) {
     *     cache.writeQuery({
     *       query: GET_TODOS,
     *       data: { todos: updatedTodos },
     *     });
     *     cache.evict({ id: "Todo:123" });
     *   },
     * });
     * ```
     *
     * @example
     *
     * ```js
     * // Optimistic update with a custom layer ID
     * cache.batch({
     *   optimistic: "add-todo-optimistic",
     *   update(cache) {
     *     cache.modify({
     *       fields: {
     *         todos(existing = []) {
     *           return [...existing, newTodoRef];
     *         },
     *       },
     *     });
     *   },
     * });
     * ```
     *
     * @returns The return value of the `update` function.
     */
    batch(options) {
        const optimisticId = typeof options.optimistic === "string" ? options.optimistic
            : options.optimistic === false ? null
                : void 0;
        let updateResult;
        this.performTransaction(() => (updateResult = options.update(this)), optimisticId);
        return updateResult;
    }
    recordOptimisticTransaction(transaction, optimisticId) {
        this.performTransaction(transaction, optimisticId);
    }
    // Optional API
    // Called once per input document, allowing the cache to make static changes
    // to the query, such as adding __typename fields.
    transformDocument(document) {
        return document;
    }
    // Called before each ApolloLink request, allowing the cache to make dynamic
    // changes to the query, such as filling in missing fragment definitions.
    transformForLink(document) {
        return document;
    }
    identify(object) {
        return;
    }
    gc() {
        return [];
    }
    modify(options) {
        return false;
    }
    readQuery(options, optimistic = !!options.optimistic) {
        return this.read({
            ...options,
            rootId: options.id || "ROOT_QUERY",
            optimistic,
        });
    }
    fragmentWatches = new Trie(true);
    /**
    * Watches the cache store of the fragment according to the options specified
    * and returns an `Observable`. We can subscribe to this
    * `Observable` and receive updated results through an
    * observer when the cache store changes.
    * 
    * You must pass in a GraphQL document with a single fragment or a document
    * with multiple fragments that represent what you are reading. If you pass
    * in a document with multiple fragments then you must also specify a
    * `fragmentName`.
    * 
    * @since 3.10.0
    * @param options - An object of type `WatchFragmentOptions` that allows
    * the cache to identify the fragment and optionally specify whether to react
    * to optimistic updates.
    */
    watchFragment(options) {
        const { fragment, fragmentName, from } = options;
        const query = this.getFragmentDoc(fragment, fragmentName);
        const fromArray = Array.isArray(from) ? from : [from];
        const ids = fromArray.map((value) => {
            // While our TypeScript types do not allow for `undefined` as a valid
            // `from`, its possible `useFragment` gives us an `undefined` since it
            // calls` cache.identify` and provides that value to `from`. We are
            // adding this fix here however to ensure those using plain JavaScript
            // and using `cache.identify` themselves will avoid seeing the obscure
            // warning.
            const id = value == null ? value : this.toCacheId(value);
            if (__DEV__) {
                const actualFragmentName = fragmentName || getFragmentDefinition(fragment).name.value;
                if (id === undefined) {
                    __DEV__ && invariant.warn(118, actualFragmentName);
                }
            }
            return id;
        });
        if (!Array.isArray(from)) {
            const observable = this.watchSingleFragment(ids[0], query, options);
            // Unfortunately we forgot to allow for `null` on watchFragment in 4.0
            // when `from` is a single record. As such, we need to fallback to {}
            // when diff.result is null to maintain backwards compatibility. We
            // should plan to change this in v5. We do however support `null` if
            // `from` is explicitly `null`.
            //
            // NOTE: Using `from` with an array will maintain `null` properly
            // without the need for a similar fallback since watchFragment with
            // arrays is new functionality in v4.1.
            return from === null ? observable : (mapObservableFragmentMemoized(observable, Symbol.for("apollo.transform.individualResult"), (result) => ({
                ...result,
                data: result.data ?? {},
            })));
        }
        let currentResult;
        function toResult(results) {
            const result = results.reduce((memo, result, idx) => {
                memo.data.push(result.data);
                memo.complete &&= result.complete;
                memo.dataState = memo.complete ? "complete" : "partial";
                if (result.missing) {
                    memo.missing ||= {};
                    memo.missing[idx] = result.missing;
                }
                return memo;
            }, {
                data: [],
                dataState: "complete",
                complete: true,
            });
            if (!equal(currentResult, result)) {
                currentResult = result;
            }
            return currentResult;
        }
        if (ids.length === 0) {
            return emptyArrayObservable;
        }
        let subscribed = false;
        const observables = ids.map((id) => this.watchSingleFragment(id, query, options));
        const observable = combineLatestBatched(observables).pipe(map(toResult), tap({
            subscribe: () => (subscribed = true),
            unsubscribe: () => (subscribed = false),
        }), shareReplay({ bufferSize: 1, refCount: true }));
        return Object.assign(observable, {
            getCurrentResult: () => {
                if (subscribed && currentResult) {
                    return currentResult;
                }
                const results = observables.map((observable) => observable.getCurrentResult());
                return toResult(results);
            },
        });
    }
    /**
     * Can be overridden by subclasses to delay calling the provided callback
     * until after all broadcasts have been completed - e.g. in a cache scenario
     * where many watchers are notified in parallel.
     */
    onAfterBroadcast = (cb) => cb();
    watchSingleFragment(id, fragmentQuery, options) {
        if (id === null) {
            return nullObservable;
        }
        const { optimistic = true, variables } = options;
        const cacheKey = [
            fragmentQuery,
            canonicalStringify({ id, optimistic, variables }),
        ];
        const cacheEntry = this.fragmentWatches.lookupArray(cacheKey);
        if (!cacheEntry.observable) {
            let subscribed = false;
            let currentResult;
            function getNewestResult(diff) {
                const data = diff.result;
                if (!currentResult ||
                    !equalByQuery(fragmentQuery, { data: currentResult.data }, { data }, options.variables)) {
                    currentResult = {
                        data,
                        dataState: diff.complete ? "complete" : "partial",
                        complete: diff.complete,
                    };
                    if (diff.missing) {
                        currentResult.missing = diff.missing.missing;
                    }
                }
                return currentResult;
            }
            const observable = new Observable((observer) => {
                subscribed = true;
                const cleanup = this.watch({
                    variables,
                    returnPartialData: true,
                    id,
                    query: fragmentQuery,
                    optimistic,
                    immediate: true,
                    callback: (diff) => {
                        observable.dirty = true;
                        this.onAfterBroadcast(() => {
                            observer.next(getNewestResult(diff));
                            observable.dirty = false;
                        });
                    },
                });
                return () => {
                    subscribed = false;
                    cleanup();
                    this.fragmentWatches.removeArray(cacheKey);
                };
            }).pipe(distinctUntilChanged(), share({
                connector: () => new ReplaySubject(1),
                // debounce so a synchronous unsubscribe+resubscribe doesn't tear down the watch and create a new one
                resetOnRefCountZero: () => timer(0),
            }));
            cacheEntry.observable = Object.assign(observable, {
                dirty: false,
                getCurrentResult: () => {
                    if (subscribed && currentResult) {
                        return currentResult;
                    }
                    return getNewestResult(this.diff({
                        id,
                        query: fragmentQuery,
                        returnPartialData: true,
                        optimistic,
                        variables,
                    }));
                },
            });
        }
        return cacheEntry.observable;
    }
    // Make sure we compute the same (===) fragment query document every
    // time we receive the same fragment in readFragment.
    getFragmentDoc = wrap(getFragmentQueryDocument, {
        max: cacheSizes["cache.fragmentQueryDocuments"] ||
            1000 /* defaultCacheSizes["cache.fragmentQueryDocuments"] */,
        cache: WeakCache,
        makeCacheKey: bindCacheKey(this),
    });
    readFragment(options, optimistic = !!options.optimistic) {
        const id = options.from !== undefined ? this.toCacheId(options.from) : options.id;
        return this.read({
            ...options,
            query: this.getFragmentDoc(options.fragment, options.fragmentName),
            rootId: id,
            optimistic,
        });
    }
    writeQuery({ id, data, ...options }) {
        return this.write(Object.assign(options, {
            dataId: id || "ROOT_QUERY",
            result: data,
        }));
    }
    writeFragment({ data, fragment, fragmentName, ...options }) {
        const id = options.from !== undefined ? this.toCacheId(options.from) : options.id;
        return this.write(Object.assign(options, {
            query: this.getFragmentDoc(fragment, fragmentName),
            dataId: id,
            result: data,
        }));
    }
    updateQuery(options, update) {
        return this.batch({
            update(cache) {
                const value = cache.readQuery(options);
                const data = update(value);
                if (data === void 0 || data === null)
                    return value;
                cache.writeQuery({ ...options, data });
                return data;
            },
        });
    }
    updateFragment(options, update) {
        return this.batch({
            update(cache) {
                const value = cache.readFragment(options);
                const data = update(value);
                if (data === void 0 || data === null)
                    return value;
                cache.writeFragment({ ...options, data });
                return data;
            },
        });
    }
    toCacheId(from) {
        return typeof from === "string" ? from : this.identify(from);
    }
}
if (__DEV__) {
    ApolloCache.prototype.getMemoryInternals = getApolloCacheMemoryInternals;
}
const nullResult = Object.freeze({
    data: null,
    dataState: "complete",
    complete: true,
});
const nullObservable = Object.assign(new Observable((observer) => {
    observer.next(nullResult);
}), { dirty: false, getCurrentResult: () => nullResult });
const emptyArrayResult = Object.freeze({
    data: [],
    dataState: "complete",
    complete: true,
});
const emptyArrayObservable = Object.assign(new Observable((observer) => {
    observer.next(emptyArrayResult);
}), { getCurrentResult: () => emptyArrayResult });
//# sourceMappingURL=cache.js.map
