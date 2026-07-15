"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useSuspenseFragment = useSuspenseFragment;
const tslib_1 = require("tslib");
const React = tslib_1.__importStar(require("react"));
const cache_1 = require("@apollo/client/cache");
const internal_1 = require("@apollo/client/react/internal");
const __use_js_1 = require("./internal/__use.cjs");
const index_js_1 = require("./internal/index.cjs");
const useApolloClient_js_1 = require("./useApolloClient.cjs");
function useSuspenseFragment(options) {
    "use no memo";
    return (0, index_js_1.wrapHook)("useSuspenseFragment", useSuspenseFragment_, (0, useApolloClient_js_1.useApolloClient)(typeof options === "object" ? options.client : undefined))(options);
}
function useSuspenseFragment_(options) {
    const client = (0, useApolloClient_js_1.useApolloClient)(options.client);
    const { from, variables } = options;
    const { cache } = client;
    const ids = (0, index_js_1.useDeepMemo)(() => {
        return Array.isArray(from) ?
            from.map((id) => toStringId(cache, id))
            : toStringId(cache, from);
    }, [cache, from]);
    const idString = React.useMemo(() => (Array.isArray(ids) ? ids.join(",") : ids), [ids]);
    const fragmentRef = (0, internal_1.getSuspenseCache)(client).getFragmentRef([options.fragment, (0, cache_1.canonicalStringify)(variables), idString], client, { ...options, variables: variables, from: ids });
    let [current, setPromise] = React.useState([fragmentRef.key, fragmentRef.promise]);
    React.useEffect(() => {
        const dispose = fragmentRef.retain();
        const removeListener = fragmentRef.listen((promise) => {
            setPromise([fragmentRef.key, promise]);
        });
        return () => {
            dispose();
            removeListener();
        };
    }, [fragmentRef]);
    if (current[0] !== fragmentRef.key) {
        // eslint-disable-next-line react-hooks/immutability
        current[0] = fragmentRef.key;
        // eslint-disable-next-line react-hooks/immutability
        current[1] = fragmentRef.promise;
    }
    const data = (0, __use_js_1.__use)(current[1]);
    return { data };
}
function toStringId(cache, from) {
    return (typeof from === "string" ? from
        : from === null ? null
            : cache.identify(from));
}
//# sourceMappingURL=useSuspenseFragment.cjs.map
