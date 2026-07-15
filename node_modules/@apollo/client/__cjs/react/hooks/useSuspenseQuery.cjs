"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useSuspenseQuery = void 0;
exports.useWatchQueryOptions = useWatchQueryOptions;
const tslib_1 = require("tslib");
const React = tslib_1.__importStar(require("react"));
const client_1 = require("@apollo/client");
const internal_1 = require("@apollo/client/react/internal");
const environment_1 = require("@apollo/client/utilities/environment");
const internal_2 = require("@apollo/client/utilities/internal");
const constants_js_1 = require("./constants.cjs");
const index_js_1 = require("./internal/index.cjs");
const validateSuspenseHookOptions_js_1 = require("./internal/validateSuspenseHookOptions.cjs");
const useApolloClient_js_1 = require("./useApolloClient.cjs");
exports.useSuspenseQuery = function useSuspenseQuery(query, options) {
    "use no memo";
    return (0, index_js_1.wrapHook)("useSuspenseQuery", useSuspenseQuery_, (0, useApolloClient_js_1.useApolloClient)(typeof options === "object" ? options.client : undefined))(query, options ?? {});
};
function useSuspenseQuery_(query, options) {
    const client = (0, useApolloClient_js_1.useApolloClient)(options.client);
    const suspenseCache = (0, internal_1.getSuspenseCache)(client);
    const watchQueryOptions = useWatchQueryOptions({
        client,
        query,
        options,
    });
    const { fetchPolicy } = watchQueryOptions;
    const cacheKey = (0, index_js_1.useSuspenseHookCacheKey)(query, options);
    const queryRef = suspenseCache.getQueryRef(cacheKey, () => client.watchQuery(watchQueryOptions));
    let [current, setPromise] = React.useState([queryRef.key, queryRef.promise]);
    // This saves us a re-execution of the render function when a variable changed.
    if (current[0] !== queryRef.key) {
        // eslint-disable-next-line react-hooks/immutability
        current[0] = queryRef.key;
        // eslint-disable-next-line react-hooks/immutability
        current[1] = queryRef.promise;
    }
    let promise = current[1];
    if (queryRef.didChangeOptions(watchQueryOptions)) {
        // eslint-disable-next-line react-hooks/immutability
        current[1] = promise = queryRef.applyOptions(watchQueryOptions);
    }
    React.useEffect(() => {
        const dispose = queryRef.retain();
        const removeListener = queryRef.listen((promise) => {
            setPromise([queryRef.key, promise]);
        });
        return () => {
            removeListener();
            dispose();
        };
    }, [queryRef]);
    const skipResult = React.useMemo(() => {
        const error = queryRef.result.error;
        const complete = !!queryRef.result.data;
        return {
            loading: false,
            data: queryRef.result.data,
            dataState: queryRef.result.dataState,
            networkStatus: error ? client_1.NetworkStatus.error : client_1.NetworkStatus.ready,
            error,
            complete,
            partial: !complete,
        };
    }, [queryRef.result]);
    const result = fetchPolicy === "standby" ? skipResult : (0, index_js_1.__use)(promise);
    const fetchMore = React.useCallback((options) => {
        const promise = queryRef.fetchMore(options);
        setPromise([queryRef.key, queryRef.promise]);
        return promise;
    }, [queryRef]);
    const refetch = React.useCallback((variables) => {
        const promise = queryRef.refetch(variables);
        setPromise([queryRef.key, queryRef.promise]);
        return promise;
    }, [queryRef]);
    // TODO: The internalQueryRef doesn't have TVariables' type information so we have to cast it here
    const subscribeToMore = queryRef.observable
        .subscribeToMore;
    return React.useMemo(() => {
        return {
            client,
            data: result.data,
            dataState: result.dataState,
            error: result.error,
            networkStatus: result.networkStatus,
            fetchMore,
            refetch,
            subscribeToMore,
        };
    }, [client, fetchMore, refetch, result, subscribeToMore]);
}
function useWatchQueryOptions({ client, query, options, }) {
    return (0, index_js_1.useDeepMemo)(() => {
        if (options === constants_js_1.skipToken) {
            return {
                query,
                fetchPolicy: "standby",
                [internal_2.variablesUnknownSymbol]: true,
            };
        }
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
        // Assign the updated fetch policy after our validation since `standby` is
        // not a supported fetch policy on its own without the use of `skip`.
        if (options.skip) {
            watchQueryOptions.fetchPolicy = "standby";
        }
        return watchQueryOptions;
    }, [client, options, query]);
}
//# sourceMappingURL=useSuspenseQuery.cjs.map
