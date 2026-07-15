"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useLoadableQuery = void 0;
const tslib_1 = require("tslib");
const React = tslib_1.__importStar(require("react"));
const cache_1 = require("@apollo/client/cache");
const internal_1 = require("@apollo/client/react/internal");
const environment_1 = require("@apollo/client/utilities/environment");
const invariant_1 = require("@apollo/client/utilities/invariant");
const index_js_1 = require("./internal/index.cjs");
const validateSuspenseHookOptions_js_1 = require("./internal/validateSuspenseHookOptions.cjs");
const useApolloClient_js_1 = require("./useApolloClient.cjs");
exports.useLoadableQuery = function useLoadableQuery(query, options = {}) {
    const client = (0, useApolloClient_js_1.useApolloClient)(options.client);
    const suspenseCache = (0, internal_1.getSuspenseCache)(client);
    const watchQueryOptions = useWatchQueryOptions({ client, query, options });
    const { queryKey = [] } = options;
    const [queryRef, setQueryRef] = React.useState(null);
    (0, internal_1.assertWrappedQueryRef)(queryRef);
    const internalQueryRef = queryRef && (0, internal_1.unwrapQueryRef)(queryRef);
    if (queryRef && internalQueryRef?.didChangeOptions(watchQueryOptions)) {
        const promise = internalQueryRef.applyOptions(watchQueryOptions);
        (0, internal_1.updateWrappedQueryRef)(queryRef, promise);
    }
    const calledDuringRender = (0, index_js_1.useRenderGuard)();
    const fetchMore = React.useCallback((options) => {
        if (!internalQueryRef) {
            throw new Error("The query has not been loaded. Please load the query.");
        }
        const promise = internalQueryRef.fetchMore(options);
        setQueryRef((0, internal_1.wrapQueryRef)(internalQueryRef));
        return promise;
    }, [internalQueryRef]);
    const refetch = React.useCallback((options) => {
        if (!internalQueryRef) {
            throw new Error("The query has not been loaded. Please load the query.");
        }
        const promise = internalQueryRef.refetch(options);
        setQueryRef((0, internal_1.wrapQueryRef)(internalQueryRef));
        return promise;
    }, [internalQueryRef]);
    const loadQuery = React.useCallback((...args) => {
        (0, invariant_1.invariant)(!calledDuringRender(), 31);
        const [variables] = args;
        const cacheKey = [
            query,
            (0, cache_1.canonicalStringify)(variables),
            ...[].concat(queryKey),
        ];
        const queryRef = suspenseCache.getQueryRef(cacheKey, () => client.watchQuery({
            ...watchQueryOptions,
            variables,
        }));
        setQueryRef((0, internal_1.wrapQueryRef)(queryRef));
    }, [
        query,
        queryKey,
        suspenseCache,
        watchQueryOptions,
        calledDuringRender,
        client,
    ]);
    const subscribeToMore = React.useCallback((options) => {
        (0, invariant_1.invariant)(internalQueryRef, 32);
        return internalQueryRef.observable.subscribeToMore(
        // TODO: The internalQueryRef doesn't have TVariables' type information so we have to cast it here
        options);
    }, [internalQueryRef]);
    const reset = React.useCallback(() => {
        setQueryRef(null);
    }, []);
    return [
        loadQuery,
        queryRef,
        { fetchMore, refetch, reset, subscribeToMore },
    ];
};
function useWatchQueryOptions({ client, query, options, }) {
    return (0, index_js_1.useDeepMemo)(() => {
        const fetchPolicy = options.fetchPolicy ||
            client.defaultOptions.watchQuery?.fetchPolicy ||
            "cache-first";
        const watchQueryOptions = {
            ...options,
            fetchPolicy,
            query,
            notifyOnNetworkStatusChange: false,
            nextFetchPolicy: void 0,
        };
        if (environment_1.__DEV__) {
            (0, validateSuspenseHookOptions_js_1.validateSuspenseHookOptions)(watchQueryOptions);
        }
        return watchQueryOptions;
    }, [client, options, query]);
}
//# sourceMappingURL=useLoadableQuery.cjs.map
