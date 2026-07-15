"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useReadQuery = useReadQuery;
const tslib_1 = require("tslib");
const React = tslib_1.__importStar(require("react"));
const internal_1 = require("@apollo/client/react/internal");
const index_js_1 = require("./internal/index.cjs");
const useApolloClient_js_1 = require("./useApolloClient.cjs");
const useSyncExternalStore_js_1 = require("./useSyncExternalStore.cjs");
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
function useReadQuery(queryRef) {
    "use no memo";
    const unwrapped = (0, internal_1.unwrapQueryRef)(queryRef);
    const clientOrObsQuery = (0, useApolloClient_js_1.useApolloClient)(unwrapped ?
        // passing an `ObservableQuery` is not supported by the types, but it will
        // return any truthy value that is passed in as an override so we cast the result
        unwrapped["observable"]
        : undefined);
    return (0, index_js_1.wrapHook)("useReadQuery", useReadQuery_, clientOrObsQuery)(queryRef);
}
function useReadQuery_(queryRef) {
    (0, internal_1.assertWrappedQueryRef)(queryRef);
    const internalQueryRef = React.useMemo(() => (0, internal_1.unwrapQueryRef)(queryRef), [queryRef]);
    const getPromise = React.useCallback(() => (0, internal_1.getWrappedPromise)(queryRef), [queryRef]);
    if (internalQueryRef.disposed) {
        internalQueryRef.reinitialize();
        (0, internal_1.updateWrappedQueryRef)(queryRef, internalQueryRef.promise);
    }
    React.useEffect(() => internalQueryRef.retain(), [internalQueryRef]);
    const promise = (0, useSyncExternalStore_js_1.useSyncExternalStore)(React.useCallback((forceUpdate) => {
        return internalQueryRef.listen((promise) => {
            (0, internal_1.updateWrappedQueryRef)(queryRef, promise);
            forceUpdate();
        });
    }, [internalQueryRef, queryRef]), getPromise, getPromise);
    const result = (0, index_js_1.__use)(promise);
    return React.useMemo(() => {
        return {
            data: result.data,
            dataState: result.dataState,
            networkStatus: result.networkStatus,
            error: result.error,
        };
    }, [result]);
}
//# sourceMappingURL=useReadQuery.cjs.map
