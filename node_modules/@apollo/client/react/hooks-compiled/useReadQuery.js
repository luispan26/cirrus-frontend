import { c as _c } from "@apollo/client/react/internal/compiler-runtime";
import * as React from "react";
import { assertWrappedQueryRef, getWrappedPromise, unwrapQueryRef, updateWrappedQueryRef, } from "@apollo/client/react/internal";
import { __use, wrapHook } from "./internal/index.js";
import { useApolloClient } from "./useApolloClient.js";
import { useSyncExternalStore } from "./useSyncExternalStore.js";
/**
 * For a detailed explanation of `useReadQuery`, see the [fetching with Suspense reference](https://www.apollographql.com/docs/react/data/suspense#avoiding-request-waterfalls).
 *
 * @param queryRef - The `QueryRef` that was generated via `useBackgroundQuery`.
 * @returns An object containing the query result data, error, and network status.
 *
 * @example
 *
 * ```jsx
 * import { Suspense } from "react";
 * import { useBackgroundQuery, useReadQuery } from "@apollo/client";
 *
 * function Parent() {
 *   const [queryRef] = useBackgroundQuery(query);
 *
 *   return (
 *     <Suspense fallback={<div>Loading...</div>}>
 *       <Child queryRef={queryRef} />
 *     </Suspense>
 *   );
 * }
 *
 * function Child({ queryRef }) {
 *   const { data } = useReadQuery(queryRef);
 *
 *   return <div>{data.name}</div>;
 * }
 * ```
 */
export function useReadQuery(queryRef) {
    "use no memo";
    const unwrapped = unwrapQueryRef(queryRef);
    const clientOrObsQuery = useApolloClient(unwrapped ?
        // passing an `ObservableQuery` is not supported by the types, but it will
        // return any truthy value that is passed in as an override so we cast the result
        unwrapped["observable"]
        : undefined);
    return wrapHook("useReadQuery", useReadQuery_, clientOrObsQuery)(queryRef);
}
function useReadQuery_(queryRef) {
    const $ = _c(17);
    assertWrappedQueryRef(queryRef);
    let t0;

    if ($[0] !== queryRef) {
        t0 = unwrapQueryRef(queryRef);
        $[0] = queryRef;
        $[1] = t0;
    } else {
        t0 = $[1];
    }

    const internalQueryRef = t0;
    let t1;

    if ($[2] !== queryRef) {
        t1 = () => getWrappedPromise(queryRef);
        $[2] = queryRef;
        $[3] = t1;
    } else {
        t1 = $[3];
    }

    const getPromise = t1;
    if (internalQueryRef.disposed) {
        internalQueryRef.reinitialize();
        updateWrappedQueryRef(queryRef, internalQueryRef.promise);
    }
    let t2;
    let t3;

    if ($[4] !== internalQueryRef) {
        t2 = () => internalQueryRef.retain();t3 = [internalQueryRef];
        $[4] = internalQueryRef;
        $[5] = t2;
        $[6] = t3;
    } else {
        t2 = $[5];
        t3 = $[6];
    }

    React.useEffect(t2, t3);
    let t4;

    if ($[7] !== internalQueryRef || $[8] !== queryRef) {
        t4 = forceUpdate => internalQueryRef.listen(promise => {
            updateWrappedQueryRef(queryRef, promise);
            forceUpdate();
        });
        $[7] = internalQueryRef;
        $[8] = queryRef;
        $[9] = t4;
    } else {
        t4 = $[9];
    }

    const promise_0 = useSyncExternalStore(t4, getPromise, getPromise);
    let t5;

    if ($[10] !== promise_0) {
        t5 = __use(promise_0);
        $[10] = promise_0;
        $[11] = t5;
    } else {
        t5 = $[11];
    }

    const result = t5;
    let t6;

    if ($[12] !== result.data || $[13] !== result.dataState || $[14] !== result.error || $[15] !== result.networkStatus) {
        t6 = {
            data: result.data,
            dataState: result.dataState,
            networkStatus: result.networkStatus,
            error: result.error
        };
        $[12] = result.data;
        $[13] = result.dataState;
        $[14] = result.error;
        $[15] = result.networkStatus;
        $[16] = t6;
    } else {
        t6 = $[16];
    }

    return t6;
}
//# sourceMappingURL=useReadQuery.js.map
