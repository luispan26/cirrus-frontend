import { c as _c } from "@apollo/client/react/internal/compiler-runtime";
/**
 * Function parameters in this file try to follow a common order for the sake of
 * readability and consistency. The order is as follows:
 *
 * resultData
 * observable
 * client
 * query
 * options
 * watchQueryOptions
 * makeWatchQueryOptions
 */
/**  */
import { equal } from "@wry/equality";
import * as React from "react";
import { asapScheduler, observeOn } from "rxjs";
import { NetworkStatus } from "@apollo/client";
import { maybeDeepFreeze, mergeOptions, variablesUnknownSymbol, } from "@apollo/client/utilities/internal";
import { skipToken } from "./constants.js";
import { useDeepMemo, wrapHook } from "./internal/index.js";
import { useApolloClient } from "./useApolloClient.js";
import { useSyncExternalStore } from "./useSyncExternalStore.js";
const lastWatchOptions = Symbol();
export const useQuery = function useQuery(query, ...[options]) {
    "use no memo";
    return wrapHook("useQuery", useQuery_, useApolloClient(typeof options === "object" ? options.client : undefined))(query, options);
};
function useQuery_(query, t0) {
    const $ = _c(38);
    let t1;

    if ($[0] !== t0) {
        t1 = t0 === undefined ? {} : t0;
        $[0] = t0;
        $[1] = t1;
    } else {
        t1 = $[1];
    }

    const options = t1;
    const client = useApolloClient(typeof options === "object" ? options.client : undefined);
    let t2;

    if ($[2] !== options) {
        t2 = typeof options === "object" ? options : {};
        $[2] = options;
        $[3] = t2;
    } else {
        t2 = $[3];
    }

    const {
        ssr
    } = t2;
    const watchQueryOptions = useOptions(query, options, client.defaultOptions.watchQuery);
    let t3;

    if ($[4] !== client || $[5] !== query || $[6] !== watchQueryOptions) {
        t3 = function createState(previous) {
            const observable = client.watchQuery(watchQueryOptions);

            return {
                client,
                query,
                observable,

                resultData: {
                    current: observable.getCurrentResult(),
                    previousData: previous?.resultData.current.data,
                    variables: observable.variables
                }
            };
        };
        $[4] = client;
        $[5] = query;
        $[6] = watchQueryOptions;
        $[7] = t3;
    } else {
        t3 = $[7];
    }

    const createState = t3;
    let [state, setState] = React.useState(createState);
    if (client !== state.client || query !== state.query) {
        const t4 = setState;
        let t5;

        if ($[8] !== createState || $[9] !== state) {
            t5 = createState(state);
            $[8] = createState;
            $[9] = state;
            $[10] = t5;
        } else {
            t5 = $[10];
        }

        t4(state = t5);
    }
    const {
        observable: observable_0,
        resultData
    } = state;
    useInitialFetchPolicyIfNecessary(watchQueryOptions, observable_0);
    useResubscribeIfNecessary(resultData, observable_0, watchQueryOptions);
    const result = useResult(observable_0, resultData, ssr);
    let t4;

    if ($[11] !== observable_0) {
        t4 = observable_0.refetch.bind(observable_0);
        $[11] = observable_0;
        $[12] = t4;
    } else {
        t4 = $[12];
    }

    let t5;

    if ($[13] !== observable_0) {
        t5 = observable_0.fetchMore.bind(observable_0);
        $[13] = observable_0;
        $[14] = t5;
    } else {
        t5 = $[14];
    }

    let t6;

    if ($[15] !== observable_0) {
        t6 = observable_0.updateQuery.bind(observable_0);
        $[15] = observable_0;
        $[16] = t6;
    } else {
        t6 = $[16];
    }

    let t7;

    if ($[17] !== observable_0) {
        t7 = observable_0.startPolling.bind(observable_0);
        $[17] = observable_0;
        $[18] = t7;
    } else {
        t7 = $[18];
    }

    let t8;

    if ($[19] !== observable_0) {
        t8 = observable_0.stopPolling.bind(observable_0);
        $[19] = observable_0;
        $[20] = t8;
    } else {
        t8 = $[20];
    }

    let t9;

    if ($[21] !== observable_0) {
        t9 = observable_0.subscribeToMore.bind(observable_0);
        $[21] = observable_0;
        $[22] = t9;
    } else {
        t9 = $[22];
    }

    let t10;

    if ($[23] !== t4 || $[24] !== t5 || $[25] !== t6 || $[26] !== t7 || $[27] !== t8 || $[28] !== t9) {
        t10 = {
            refetch: t4,
            fetchMore: t5,
            updateQuery: t6,
            startPolling: t7,
            stopPolling: t8,
            subscribeToMore: t9
        };
        $[23] = t4;
        $[24] = t5;
        $[25] = t6;
        $[26] = t7;
        $[27] = t8;
        $[28] = t9;
        $[29] = t10;
    } else {
        t10 = $[29];
    }

    const obsQueryFields = t10;
    const previousData = resultData.previousData;
    let rest;

    if ($[30] !== result) {
        const {
            partial,
            ...t11
        } = result;
        rest = t11;
        $[30] = result;
        $[31] = rest;
    } else {
        rest = $[31];
    }

    let t11;

    if ($[32] !== client || $[33] !== obsQueryFields || $[34] !== observable_0 || $[35] !== previousData || $[36] !== rest) {
        t11 = {
            ...rest,
            client,
            observable: observable_0,
            variables: observable_0.variables,
            previousData,
            ...obsQueryFields
        };
        $[32] = client;
        $[33] = obsQueryFields;
        $[34] = observable_0;
        $[35] = previousData;
        $[36] = rest;
        $[37] = t11;
    } else {
        t11 = $[37];
    }

    return t11;
}
const fromSkipToken = Symbol();
function useOptions(query, options, defaultOptions) {
    const $ = _c(5);
    let t0;
    let t1;

    if ($[0] !== defaultOptions || $[1] !== options || $[2] !== query) {
        t0 = () => {
            if (options === skipToken) {
                const opts = {
                    ...mergeOptions(defaultOptions, {
                        query,
                        fetchPolicy: "standby"
                    }),

                    [variablesUnknownSymbol]: true
                };
                opts[fromSkipToken] = true;
                return opts;
            }
            const watchQueryOptions = mergeOptions(defaultOptions, {
                ...options,
                query
            });
            if (options.skip) {
                watchQueryOptions.initialFetchPolicy = options.initialFetchPolicy || options.fetchPolicy;
                watchQueryOptions.fetchPolicy = "standby";
            }
            return watchQueryOptions;
        };t1 = [query, options, defaultOptions];
        $[0] = defaultOptions;
        $[1] = options;
        $[2] = query;
        $[3] = t0;
        $[4] = t1;
    } else {
        t0 = $[3];
        t1 = $[4];
    }

    return useDeepMemo(t0, t1);
}
function useInitialFetchPolicyIfNecessary(watchQueryOptions, observable) {
    "use no memo";
    if (!watchQueryOptions.fetchPolicy) {
        watchQueryOptions.fetchPolicy = observable.options.initialFetchPolicy;
    }
}
function useResult(observable, resultData, ssr) {
    "use no memo";
    const fetchPolicy = observable.options.fetchPolicy;
    return useSyncExternalStore(React.useCallback((handleStoreChange) => {
        const subscription = observable
            // We use the asapScheduler here to prevent issues with trying to
            // update in the middle of a render. `reobserve` is kicked off in the
            // middle of a render and because RxJS emits values synchronously,
            // its possible for this `handleStoreChange` to be called in that same
            // render. This allows the render to complete before trying to emit a
            // new value.
            .pipe(observeOn(asapScheduler))
            .subscribe((result) => {
            const previous = resultData.current;
            if (
            // Avoid rerendering if the result is the same
            equal(previous, result) &&
                // Force rerender if the value was emitted because variables
                // changed, such as when calling `refetch(newVars)` which returns
                // the same data when `notifyOnNetworkStatusChange` is `false`.
                equal(resultData.variables, observable.variables)) {
                return;
            }
            resultData.variables = observable.variables;
            if (previous.data && !equal(previous.data, result.data)) {
                resultData.previousData = previous.data;
            }
            resultData.current = result;
            handleStoreChange();
        });
        // Do the "unsubscribe" with a short delay.
        // This way, an existing subscription can be reused without an additional
        // request if "unsubscribe"  and "resubscribe" to the same ObservableQuery
        // happen in very fast succession.
        return () => {
            setTimeout(() => subscription.unsubscribe());
        };
    }, [observable, resultData]), () => resultData.current, () => ((fetchPolicy !== "standby" && ssr === false) ||
        fetchPolicy === "no-cache") ?
        useQuery.ssrDisabledResult
        : resultData.current);
}
// this hook is not compatible with any rules of React, and there's no good way to rewrite it.
// it should stay a separate hook that will not be optimized by the compiler
function useResubscribeIfNecessary(
/** this hook will mutate properties on `resultData` */
resultData, 
/** this hook will mutate properties on `observable` */
observable, watchQueryOptions) {
    "use no memo";
    if (observable[lastWatchOptions] &&
        !equal(observable[lastWatchOptions], watchQueryOptions)) {
        // If skipToken was used to generate options, we won't know the correct
        // initialFetchPolicy until the hook is rerendered with real options, so we
        // set it the next time we get real options
        if (observable[lastWatchOptions][fromSkipToken] &&
            !watchQueryOptions.initialFetchPolicy) {
            watchQueryOptions.initialFetchPolicy =
                watchQueryOptions.fetchPolicy;
        }
        // Though it might be tempting to postpone this reobserve call to the
        // useEffect block, we need getCurrentResult to return an appropriate
        // loading:true result synchronously (later within the same call to
        // useQuery). Since we already have this.observable here (not true for
        // the very first call to useQuery), we are not initiating any new
        // subscriptions, though it does feel less than ideal that reobserve
        // (potentially) kicks off a network request (for example, when the
        // variables have changed), which is technically a side-effect.
        if (shouldReobserve(observable[lastWatchOptions], watchQueryOptions)) {
            observable.reobserve(watchQueryOptions);
        }
        else {
            observable.applyOptions(watchQueryOptions);
        }
        // Make sure getCurrentResult returns a fresh ApolloQueryResult<TData>,
        // but save the current data as this.previousData, just like setResult
        // usually does.
        const result = observable.getCurrentResult();
        if (!equal(result.data, resultData.current.data)) {
            resultData.previousData = (resultData.current.data ||
                resultData.previousData);
        }
        resultData.current = result;
        resultData.variables = observable.variables;
    }
    observable[lastWatchOptions] = watchQueryOptions;
}
function shouldReobserve(previousOptions, options) {
    return (previousOptions.query !== options.query ||
        !equal(previousOptions.variables, options.variables) ||
        (previousOptions.fetchPolicy !== options.fetchPolicy &&
            (options.fetchPolicy === "standby" ||
                previousOptions.fetchPolicy === "standby")));
}
useQuery.ssrDisabledResult = maybeDeepFreeze({
    loading: true,
    data: void 0,
    dataState: "empty",
    error: void 0,
    networkStatus: NetworkStatus.loading,
    partial: true,
});
//# sourceMappingURL=useQuery.js.map
