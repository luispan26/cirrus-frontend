"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useBackgroundQuery = void 0;
const tslib_1 = require("tslib");
const React = tslib_1.__importStar(require("react"));
const internal_1 = require("@apollo/client/react/internal");
const index_js_1 = require("./internal/index.cjs");
const useApolloClient_js_1 = require("./useApolloClient.cjs");
const useSuspenseQuery_js_1 = require("./useSuspenseQuery.cjs");
exports.useBackgroundQuery = function useBackgroundQuery(query, options) {
    "use no memo";
    return (0, index_js_1.wrapHook)("useBackgroundQuery", useBackgroundQuery_, (0, useApolloClient_js_1.useApolloClient)(typeof options === "object" ? options.client : undefined))(query, options ?? {});
};
function useBackgroundQuery_(query, options) {
    const client = (0, useApolloClient_js_1.useApolloClient)(options.client);
    const suspenseCache = (0, internal_1.getSuspenseCache)(client);
    const watchQueryOptions = (0, useSuspenseQuery_js_1.useWatchQueryOptions)({ client, query, options });
    const { fetchPolicy } = watchQueryOptions;
    const cacheKey = (0, index_js_1.useSuspenseHookCacheKey)(query, options);
    // This ref tracks the first time query execution is enabled to determine
    // whether to return a query ref or `undefined`. When initialized
    // in a skipped state (either via `skip: true` or `skipToken`) we return
    // `undefined` for the `queryRef` until the query has been enabled. Once
    // enabled, a query ref is always returned regardless of whether the query is
    // skipped again later.
    const didFetchResult = React.useRef(fetchPolicy !== "standby");
    didFetchResult.current ||= fetchPolicy !== "standby";
    const queryRef = suspenseCache.getQueryRef(cacheKey, () => client.watchQuery(watchQueryOptions));
    const [wrappedQueryRef, setWrappedQueryRef] = React.useState((0, internal_1.wrapQueryRef)(queryRef));
    if ((0, internal_1.unwrapQueryRef)(wrappedQueryRef) !== queryRef) {
        setWrappedQueryRef((0, internal_1.wrapQueryRef)(queryRef));
    }
    if (queryRef.didChangeOptions(watchQueryOptions)) {
        const promise = queryRef.applyOptions(watchQueryOptions);
        (0, internal_1.updateWrappedQueryRef)(wrappedQueryRef, promise);
    }
    // This prevents issues where rerendering useBackgroundQuery after the
    // queryRef has been disposed would cause the hook to return a new queryRef
    // instance since disposal also removes it from the suspense cache. We add
    // the queryRef back in the suspense cache so that the next render will reuse
    // this queryRef rather than initializing a new instance.
    React.useEffect(() => {
        // Since the queryRef is disposed async via `setTimeout`, we have to wait a
        // tick before checking it and adding back to the suspense cache.
        const id = setTimeout(() => {
            if (queryRef.disposed) {
                suspenseCache.add(cacheKey, queryRef);
            }
        });
        return () => clearTimeout(id);
        // Omitting the deps is intentional. This avoids stale closures and the
        // conditional ensures we aren't running the logic on each render.
    });
    const fetchMore = React.useCallback((options) => {
        const promise = queryRef.fetchMore(options);
        setWrappedQueryRef((0, internal_1.wrapQueryRef)(queryRef));
        return promise;
    }, [queryRef]);
    const refetch = React.useCallback((variables) => {
        const promise = queryRef.refetch(variables);
        setWrappedQueryRef((0, internal_1.wrapQueryRef)(queryRef));
        return promise;
    }, [queryRef]);
    React.useEffect(() => queryRef.softRetain(), [queryRef]);
    return [
        didFetchResult.current ? wrappedQueryRef : void 0,
        {
            fetchMore,
            refetch,
            // TODO: The internalQueryRef doesn't have TVariables' type information so we have to cast it here
            subscribeToMore: queryRef.observable
                .subscribeToMore,
        },
    ];
}
//# sourceMappingURL=useBackgroundQuery.cjs.map
