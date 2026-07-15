"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useFragment = useFragment;
const tslib_1 = require("tslib");
const React = tslib_1.__importStar(require("react"));
const index_js_1 = require("./internal/index.cjs");
const useApolloClient_js_1 = require("./useApolloClient.cjs");
const useSyncExternalStore_js_1 = require("./useSyncExternalStore.cjs");
function useFragment(options) {
    "use no memo";
    return (0, index_js_1.wrapHook)("useFragment", useFragment_, (0, useApolloClient_js_1.useApolloClient)(options.client))(options);
}
function useFragment_(options) {
    const client = (0, useApolloClient_js_1.useApolloClient)(options.client);
    const { from, ...rest } = options;
    const { cache } = client;
    // We calculate the cache id seperately because we don't want changes to non
    // key fields in the `from` property to recreate the observable. If the cache
    // identifier stays the same between renders, we want to reuse the existing
    // subscription.
    const ids = (0, index_js_1.useDeepMemo)(() => {
        const fromArray = Array.isArray(from) ? from : [from];
        const ids = fromArray.map((value) => typeof value === "string" ? value
            : value === null ? null
                : cache.identify(value));
        return Array.isArray(from) ? ids : ids[0];
    }, [cache, from]);
    const stableOptions = (0, index_js_1.useDeepMemo)(() => ({ ...rest, from: ids }), [rest, ids]);
    const observable = React.useMemo(() => client.watchFragment(stableOptions), [client, stableOptions]);
    // Unfortunately we forgot to update the use case of `from: null` on
    // useFragment in 4.0 to match `useSuspenseFragment`. As such, we need to
    // fallback to data: {} with complete: false when `from` is `null` to maintain
    // backwards compatibility. We should plan to change this in v5.
    const getSnapshot = React.useCallback(() => (from === null ? nullResult : observable.getCurrentResult()), [from, observable]);
    return (0, useSyncExternalStore_js_1.useSyncExternalStore)(React.useCallback((update) => {
        let lastTimeout = 0;
        const subscription = observable.subscribe({
            next: () => {
                // If we get another update before we've re-rendered, bail out of
                // the update and try again. This ensures that the relative timing
                // between useQuery and useFragment stays roughly the same as
                // fixed in https://github.com/apollographql/apollo-client/pull/11083
                clearTimeout(lastTimeout);
                lastTimeout = setTimeout(update);
            },
        });
        return () => {
            subscription.unsubscribe();
            clearTimeout(lastTimeout);
        };
    }, [observable]), getSnapshot, getSnapshot);
}
const nullResult = Object.freeze({
    data: {},
    dataState: "partial",
    complete: false,
});
//# sourceMappingURL=useFragment.cjs.map
