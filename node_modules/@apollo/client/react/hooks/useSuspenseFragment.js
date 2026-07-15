import * as React from "react";
import { canonicalStringify } from "@apollo/client/cache";
import { getSuspenseCache } from "@apollo/client/react/internal";
import { __use } from "./internal/__use.js";
import { useDeepMemo, wrapHook } from "./internal/index.js";
import { useApolloClient } from "./useApolloClient.js";
export function useSuspenseFragment(options) {
    "use no memo";
    return wrapHook("useSuspenseFragment", useSuspenseFragment_, useApolloClient(typeof options === "object" ? options.client : undefined))(options);
}
function useSuspenseFragment_(options) {
    const client = useApolloClient(options.client);
    const { from, variables } = options;
    const { cache } = client;
    const ids = useDeepMemo(() => {
        return Array.isArray(from) ?
            from.map((id) => toStringId(cache, id))
            : toStringId(cache, from);
    }, [cache, from]);
    const idString = React.useMemo(() => (Array.isArray(ids) ? ids.join(",") : ids), [ids]);
    const fragmentRef = getSuspenseCache(client).getFragmentRef([options.fragment, canonicalStringify(variables), idString], client, { ...options, variables: variables, from: ids });
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
    const data = __use(current[1]);
    return { data };
}
function toStringId(cache, from) {
    return (typeof from === "string" ? from
        : from === null ? null
            : cache.identify(from));
}
//# sourceMappingURL=useSuspenseFragment.js.map