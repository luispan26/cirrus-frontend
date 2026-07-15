import { c as _c } from "@apollo/client/react/internal/compiler-runtime";
import * as React from "react";
import { assertWrappedQueryRef, getWrappedPromise, unwrapQueryRef, updateWrappedQueryRef, wrapQueryRef, } from "@apollo/client/react/internal";
import { wrapHook } from "./internal/index.js";
import { useApolloClient } from "./useApolloClient.js";
/**
 * A React hook that returns a `refetch` and `fetchMore` function for a given
 * `queryRef`.
 *
 * This is useful to get access to handlers for a `queryRef` that was created by
 * `createQueryPreloader` or when the handlers for a `queryRef` produced in
 * a different component are inaccessible.
 *
 * @example
 *
 * ```tsx
 * const MyComponent({ queryRef }) {
 *   const { refetch, fetchMore } = useQueryRefHandlers(queryRef);
 *
 *   // ...
 * }
 * ```
 *
 * @param queryRef - A `QueryRef` returned from `useBackgroundQuery`, `useLoadableQuery`, or `createQueryPreloader`.
 */
export function useQueryRefHandlers(queryRef) {
    "use no memo";
    const unwrapped = unwrapQueryRef(queryRef);
    const clientOrObsQuery = useApolloClient(unwrapped ?
        // passing an `ObservableQuery` is not supported by the types, but it will
        // return any truthy value that is passed in as an override so we cast the result
        unwrapped["observable"]
        : undefined);
    return wrapHook("useQueryRefHandlers", useQueryRefHandlers_, clientOrObsQuery)(queryRef);
}
function useQueryRefHandlers_(queryRef) {
    const $ = _c(10);
    assertWrappedQueryRef(queryRef);
    const [previousQueryRef, setPreviousQueryRef] = React.useState(queryRef);
    const [wrappedQueryRef, setWrappedQueryRef] = React.useState(queryRef);
    let t0;

    if ($[0] !== queryRef) {
        t0 = unwrapQueryRef(queryRef);
        $[0] = queryRef;
        $[1] = t0;
    } else {
        t0 = $[1];
    }

    const internalQueryRef = t0;
    if (previousQueryRef !== queryRef) {
        setPreviousQueryRef(queryRef);
        setWrappedQueryRef(queryRef);
    } else {
        updateWrappedQueryRef(queryRef, getWrappedPromise(wrappedQueryRef));
    }
    let t1;

    if ($[2] !== internalQueryRef) {
        t1 = variables => {
            const promise = internalQueryRef.refetch(variables);
            setWrappedQueryRef(wrapQueryRef(internalQueryRef));
            return promise;
        };
        $[2] = internalQueryRef;
        $[3] = t1;
    } else {
        t1 = $[3];
    }

    const refetch = t1;
    let t2;

    if ($[4] !== internalQueryRef) {
        t2 = options => {
            const promise_0 = internalQueryRef.fetchMore(options);
            setWrappedQueryRef(wrapQueryRef(internalQueryRef));
            return promise_0;
        };
        $[4] = internalQueryRef;
        $[5] = t2;
    } else {
        t2 = $[5];
    }

    const fetchMore = t2;
    let t3;

    if ($[6] !== fetchMore || $[7] !== internalQueryRef.observable.subscribeToMore || $[8] !== refetch) {
        t3 = {
            refetch,
            fetchMore,
            subscribeToMore: internalQueryRef.observable.subscribeToMore
        };
        $[6] = fetchMore;
        $[7] = internalQueryRef.observable.subscribeToMore;
        $[8] = refetch;
        $[9] = t3;
    } else {
        t3 = $[9];
    }

    return t3;
}
//# sourceMappingURL=useQueryRefHandlers.js.map
