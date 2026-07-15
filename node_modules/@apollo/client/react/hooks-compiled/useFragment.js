import { c as _c } from "@apollo/client/react/internal/compiler-runtime";
import * as React from "react";
import { useDeepMemo, wrapHook } from "./internal/index.js";
import { useApolloClient } from "./useApolloClient.js";
import { useSyncExternalStore } from "./useSyncExternalStore.js";
export function useFragment(options) {
    "use no memo";
    return wrapHook("useFragment", useFragment_, useApolloClient(options.client))(options);
}
function useFragment_(options) {
    const $ = _c(19);
    const client = useApolloClient(options.client);
    let from;
    let rest;

    if ($[0] !== options) {
        ({
            from,
            ...rest
        } = options);
        $[0] = options;
        $[1] = from;
        $[2] = rest;
    } else {
        from = $[1];
        rest = $[2];
    }

    const {
        cache
    } = client;
    let t0;
    let t1;

    if ($[3] !== cache || $[4] !== from) {
        t0 = () => {
            const fromArray = Array.isArray(from) ? from : [from];
            const ids = fromArray.map(
                value => typeof value === "string" ? value : value === null ? null : cache.identify(value)
            );
            return Array.isArray(from) ? ids : ids[0];
        };t1 = [cache, from];
        $[3] = cache;
        $[4] = from;
        $[5] = t0;
        $[6] = t1;
    } else {
        t0 = $[5];
        t1 = $[6];
    }

    const ids_0 = useDeepMemo(t0, t1);
    let t2;
    let t3;

    if ($[7] !== ids_0 || $[8] !== rest) {
        t2 = () => ({
            ...rest,
            from: ids_0
        });t3 = [rest, ids_0];
        $[7] = ids_0;
        $[8] = rest;
        $[9] = t2;
        $[10] = t3;
    } else {
        t2 = $[9];
        t3 = $[10];
    }

    const stableOptions = useDeepMemo(t2, t3);
    let t4;

    if ($[11] !== client || $[12] !== stableOptions) {
        t4 = client.watchFragment(stableOptions);
        $[11] = client;
        $[12] = stableOptions;
        $[13] = t4;
    } else {
        t4 = $[13];
    }

    const observable = t4;
    let t5;

    if ($[14] !== from || $[15] !== observable) {
        t5 = () => from === null ? nullResult : observable.getCurrentResult();
        $[14] = from;
        $[15] = observable;
        $[16] = t5;
    } else {
        t5 = $[16];
    }

    const getSnapshot = t5;
    let t6;

    if ($[17] !== observable) {
        t6 = update => {
            let lastTimeout = 0;
            const subscription = observable.subscribe({
                next: () => {
                    clearTimeout(lastTimeout);
                    lastTimeout = setTimeout(update);
                }
            });

            return () => {
                subscription.unsubscribe();
                clearTimeout(lastTimeout);
            };
        };
        $[17] = observable;
        $[18] = t6;
    } else {
        t6 = $[18];
    }

    return useSyncExternalStore(t6, getSnapshot, getSnapshot);
}
const nullResult = Object.freeze({
    data: {},
    dataState: "partial",
    complete: false,
});
//# sourceMappingURL=useFragment.js.map
