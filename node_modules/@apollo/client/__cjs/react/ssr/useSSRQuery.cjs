"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useSSRQuery = void 0;
const client_1 = require("@apollo/client");
const react_1 = require("@apollo/client/react");
const internal_1 = require("@apollo/client/utilities/internal");
const skipStandbyResult = (0, internal_1.maybeDeepFreeze)({
    loading: false,
    data: void 0,
    dataState: "empty",
    error: void 0,
    networkStatus: client_1.NetworkStatus.ready,
    partial: true,
});
const useSSRQuery = function (query, options = {}) {
    "use no memo";
    function notAllowed() {
        throw new Error("This method cannot be called during SSR.");
    }
    const client = (0, react_1.useApolloClient)(typeof options === "object" ? options.client : undefined);
    const baseResult = {
        client,
        refetch: notAllowed,
        fetchMore: notAllowed,
        subscribeToMore: notAllowed,
        updateQuery: notAllowed,
        startPolling: notAllowed,
        stopPolling: notAllowed,
        variables: typeof options === "object" ? options?.variables : undefined,
        previousData: undefined,
    };
    if (options === react_1.skipToken ||
        options.skip ||
        options.fetchPolicy === "standby") {
        return withoutObservableAccess({
            ...baseResult,
            ...skipStandbyResult,
        });
    }
    if (options.ssr === false || options.fetchPolicy === "no-cache") {
        return withoutObservableAccess({
            ...baseResult,
            ...react_1.useQuery.ssrDisabledResult,
        });
    }
    let observable = this.getObservableQuery(query, options.variables);
    if (!observable) {
        observable = client.watchQuery({
            query,
            ...options,
            fetchPolicy: (options.fetchPolicy === "network-only" ||
                options.fetchPolicy === "cache-and-network") ?
                "cache-first"
                : options.fetchPolicy,
        });
        this.onCreatedObservableQuery(observable, query, options.variables);
    }
    return {
        observable,
        ...observable.getCurrentResult(),
        ...baseResult,
    };
};
exports.useSSRQuery = useSSRQuery;
function withoutObservableAccess(value) {
    Object.defineProperty(value, "observable", {
        get() {
            throw new Error('"observable" property is not accessible on skipped hooks or hook calls with `ssr: false` during SSR');
        },
    });
    return value;
}
//# sourceMappingURL=useSSRQuery.cjs.map
