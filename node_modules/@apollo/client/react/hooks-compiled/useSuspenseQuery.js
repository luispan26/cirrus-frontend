import { c as _c } from "@apollo/client/react/internal/compiler-runtime";
import * as React from "react";
import { NetworkStatus } from "@apollo/client";
import { getSuspenseCache } from "@apollo/client/react/internal";
import { __DEV__ } from "@apollo/client/utilities/environment";
import { variablesUnknownSymbol } from "@apollo/client/utilities/internal";
import { skipToken } from "./constants.js";
import { __use, useDeepMemo, useSuspenseHookCacheKey, wrapHook, } from "./internal/index.js";
import { validateSuspenseHookOptions } from "./internal/validateSuspenseHookOptions.js";
import { useApolloClient } from "./useApolloClient.js";
export const useSuspenseQuery = function useSuspenseQuery(query, options) {
    "use no memo";
    return wrapHook("useSuspenseQuery", useSuspenseQuery_, useApolloClient(typeof options === "object" ? options.client : undefined))(query, options ?? {});
};
function useSuspenseQuery_(query, options) {
    const client = useApolloClient(options.client);
    const suspenseCache = getSuspenseCache(client);
    const watchQueryOptions = useWatchQueryOptions({
        client,
        query,
        options,
    });
    const { fetchPolicy } = watchQueryOptions;
    const cacheKey = useSuspenseHookCacheKey(query, options);
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
        const removeListener = queryRef.listen((promise_0) => {
            setPromise([queryRef.key, promise_0]);
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
            networkStatus: error ? NetworkStatus.error : NetworkStatus.ready,
            error,
            complete,
            partial: !complete,
        };
    }, [queryRef.result]);
    const result = fetchPolicy === "standby" ? skipResult : __use(promise);
    const fetchMore = React.useCallback((options_0) => {
        const promise_1 = queryRef.fetchMore(options_0);
        setPromise([queryRef.key, queryRef.promise]);
        return promise_1;
    }, [queryRef]);
    const refetch = React.useCallback((variables) => {
        const promise_2 = queryRef.refetch(variables);
        setPromise([queryRef.key, queryRef.promise]);
        return promise_2;
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
export function useWatchQueryOptions(t0) {
    const $ = _c(5);
    const {
        client,
        query,
        options
    } = t0;
    let t1;
    let t2;

    if ($[0] !== client || $[1] !== options || $[2] !== query) {
        t1 = () => {
            if (options === skipToken) {
                return {
                    query,
                    fetchPolicy: "standby",
                    [variablesUnknownSymbol]: true
                };
            }
            const fetchPolicy = options.fetchPolicy || client.defaultOptions.watchQuery?.fetchPolicy || "cache-first";
            const watchQueryOptions = {
                ...options,
                fetchPolicy,
                query,
                notifyOnNetworkStatusChange: false,
                nextFetchPolicy: void 0
            };
            if (__DEV__) {
                validateSuspenseHookOptions(watchQueryOptions);
            }
            if (options.skip) {
                watchQueryOptions.fetchPolicy = "standby";
            }
            return watchQueryOptions;
        };t2 = [client, options, query];
        $[0] = client;
        $[1] = options;
        $[2] = query;
        $[3] = t1;
        $[4] = t2;
    } else {
        t1 = $[3];
        t2 = $[4];
    }

    return useDeepMemo(t1, t2);
}
//# sourceMappingURL=useSuspenseQuery.js.map
