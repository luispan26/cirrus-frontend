"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useQueryRefHandlers = useQueryRefHandlers;
const tslib_1 = require("tslib");
const React = tslib_1.__importStar(require("react"));
const internal_1 = require("@apollo/client/react/internal");
const index_js_1 = require("./internal/index.cjs");
const useApolloClient_js_1 = require("./useApolloClient.cjs");
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
function useQueryRefHandlers(queryRef) {
    "use no memo";
    const unwrapped = (0, internal_1.unwrapQueryRef)(queryRef);
    const clientOrObsQuery = (0, useApolloClient_js_1.useApolloClient)(unwrapped ?
        // passing an `ObservableQuery` is not supported by the types, but it will
        // return any truthy value that is passed in as an override so we cast the result
        unwrapped["observable"]
        : undefined);
    return (0, index_js_1.wrapHook)("useQueryRefHandlers", useQueryRefHandlers_, clientOrObsQuery)(queryRef);
}
function useQueryRefHandlers_(queryRef) {
    (0, internal_1.assertWrappedQueryRef)(queryRef);
    const [previousQueryRef, setPreviousQueryRef] = React.useState(queryRef);
    const [wrappedQueryRef, setWrappedQueryRef] = React.useState(queryRef);
    const internalQueryRef = (0, internal_1.unwrapQueryRef)(queryRef);
    // To ensure we can support React transitions, this hook needs to manage the
    // queryRef state and apply React's state value immediately to the existing
    // queryRef since this hook doesn't return the queryRef directly
    if (previousQueryRef !== queryRef) {
        setPreviousQueryRef(queryRef);
        setWrappedQueryRef(queryRef);
    }
    else {
        (0, internal_1.updateWrappedQueryRef)(queryRef, (0, internal_1.getWrappedPromise)(wrappedQueryRef));
    }
    const refetch = React.useCallback((variables) => {
        const promise = internalQueryRef.refetch(variables);
        setWrappedQueryRef((0, internal_1.wrapQueryRef)(internalQueryRef));
        return promise;
    }, [internalQueryRef]);
    const fetchMore = React.useCallback((options) => {
        const promise = internalQueryRef.fetchMore(options);
        setWrappedQueryRef((0, internal_1.wrapQueryRef)(internalQueryRef));
        return promise;
    }, [internalQueryRef]);
    return {
        refetch,
        fetchMore,
        // TODO: The internalQueryRef doesn't have TVariables' type information so we have to cast it here
        subscribeToMore: internalQueryRef.observable
            .subscribeToMore,
    };
}
//# sourceMappingURL=useQueryRefHandlers.cjs.map
