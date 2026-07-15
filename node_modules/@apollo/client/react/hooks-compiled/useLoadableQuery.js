import { c as _c } from "@apollo/client/react/internal/compiler-runtime";
import * as React from "react";
import { canonicalStringify } from "@apollo/client/cache";
import { assertWrappedQueryRef, getSuspenseCache, unwrapQueryRef, updateWrappedQueryRef, wrapQueryRef, } from "@apollo/client/react/internal";
import { __DEV__ } from "@apollo/client/utilities/environment";
import { invariant } from "@apollo/client/utilities/invariant";
import { useDeepMemo, useRenderGuard } from "./internal/index.js";
import { validateSuspenseHookOptions } from "./internal/validateSuspenseHookOptions.js";
import { useApolloClient } from "./useApolloClient.js";
export const useLoadableQuery = function useLoadableQuery(query, t0) {
    const $ = _c(35);
    let t1;

    if ($[0] !== t0) {
        t1 = t0 === undefined ? {} : t0;
        $[0] = t0;
        $[1] = t1;
    } else {
        t1 = $[1];
    }

    const options = t1;
    const client = useApolloClient(options.client);
    let t2;

    if ($[2] !== client) {
        t2 = getSuspenseCache(client);
        $[2] = client;
        $[3] = t2;
    } else {
        t2 = $[3];
    }

    const suspenseCache = t2;
    let t3;

    if ($[4] !== client || $[5] !== options || $[6] !== query) {
        t3 = {
            client,
            query,
            options
        };
        $[4] = client;
        $[5] = options;
        $[6] = query;
        $[7] = t3;
    } else {
        t3 = $[7];
    }

    const watchQueryOptions = useWatchQueryOptions(t3);
    const {
        queryKey: t4
    } = options;
    let t5;

    if ($[8] !== t4) {
        t5 = t4 === undefined ? [] : t4;
        $[8] = t4;
        $[9] = t5;
    } else {
        t5 = $[9];
    }

    const queryKey = t5;
    const [queryRef, setQueryRef] = React.useState(null);
    assertWrappedQueryRef(queryRef);
    let internalQueryRef;

    if ($[10] !== queryRef || $[11] !== watchQueryOptions) {
        internalQueryRef = queryRef && unwrapQueryRef(queryRef);
        if (queryRef && internalQueryRef?.didChangeOptions(watchQueryOptions)) {
            const promise = internalQueryRef.applyOptions(watchQueryOptions);
            updateWrappedQueryRef(queryRef, promise);
        }
        $[10] = queryRef;
        $[11] = watchQueryOptions;
        $[12] = internalQueryRef;
    } else {
        internalQueryRef = $[12];
    }

    const calledDuringRender = useRenderGuard();
    let t6;

    if ($[13] !== internalQueryRef) {
        t6 = options_0 => {
            if (!internalQueryRef) {
                throw new Error("The query has not been loaded. Please load the query.");
            }
            const promise_0 = internalQueryRef.fetchMore(options_0);
            setQueryRef(wrapQueryRef(internalQueryRef));
            return promise_0;
        };
        $[13] = internalQueryRef;
        $[14] = t6;
    } else {
        t6 = $[14];
    }

    const fetchMore = t6;
    let t7;

    if ($[15] !== internalQueryRef) {
        t7 = options_1 => {
            if (!internalQueryRef) {
                throw new Error("The query has not been loaded. Please load the query.");
            }
            const promise_1 = internalQueryRef.refetch(options_1);
            setQueryRef(wrapQueryRef(internalQueryRef));
            return promise_1;
        };
        $[15] = internalQueryRef;
        $[16] = t7;
    } else {
        t7 = $[16];
    }

    const refetch = t7;
    let t8;

    if ($[17] !== calledDuringRender || $[18] !== client || $[19] !== query || $[20] !== queryKey || $[21] !== suspenseCache || $[22] !== watchQueryOptions) {
        t8 = (...t9) => {
            const args = t9;
            invariant(!calledDuringRender(), 31);
            const [variables] = args;
            const cacheKey = [query, canonicalStringify(variables), ...[].concat(queryKey)];
            const queryRef_0 = suspenseCache.getQueryRef(cacheKey, () => client.watchQuery({
                ...watchQueryOptions,
                variables
            }));
            setQueryRef(wrapQueryRef(queryRef_0));
        };
        $[17] = calledDuringRender;
        $[18] = client;
        $[19] = query;
        $[20] = queryKey;
        $[21] = suspenseCache;
        $[22] = watchQueryOptions;
        $[23] = t8;
    } else {
        t8 = $[23];
    }

    const loadQuery = t8;
    let t9;

    if ($[24] !== internalQueryRef) {
        t9 = options_2 => {
            invariant(internalQueryRef, 32);
            return internalQueryRef.observable.subscribeToMore(options_2);
        };
        $[24] = internalQueryRef;
        $[25] = t9;
    } else {
        t9 = $[25];
    }

    const subscribeToMore = t9;
    let t10;

    if ($[26] === Symbol.for("react.memo_cache_sentinel")) {
        t10 = () => {
            setQueryRef(null);
        };
        $[26] = t10;
    } else {
        t10 = $[26];
    }

    const reset = t10;
    let t11;

    if ($[27] !== fetchMore || $[28] !== refetch || $[29] !== subscribeToMore) {
        t11 = {
            fetchMore,
            refetch,
            reset,
            subscribeToMore
        };
        $[27] = fetchMore;
        $[28] = refetch;
        $[29] = subscribeToMore;
        $[30] = t11;
    } else {
        t11 = $[30];
    }

    let t12;

    if ($[31] !== loadQuery || $[32] !== queryRef || $[33] !== t11) {
        t12 = [loadQuery, queryRef, t11];
        $[31] = loadQuery;
        $[32] = queryRef;
        $[33] = t11;
        $[34] = t12;
    } else {
        t12 = $[34];
    }

    return t12;
};
function useWatchQueryOptions(t0) {
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

//# sourceMappingURL=useLoadableQuery.js.map
