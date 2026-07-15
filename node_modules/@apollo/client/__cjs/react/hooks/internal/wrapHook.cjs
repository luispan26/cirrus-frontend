"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wrapHook = wrapHook;
const tslib_1 = require("tslib");
const React = tslib_1.__importStar(require("react"));
const internal_1 = require("@apollo/client/react/internal");
// direct import to avoid circular dependency
const ApolloContext_js_1 = require("../../context/ApolloContext.cjs");
/**
* @internal
*
* Makes an Apollo Client hook "wrappable".
* That means that the Apollo Client instance can expose a "wrapper" that will be
* used to wrap the original hook implementation with additional logic.
* @example
*
* ```tsx
* // this is already done in `@apollo/client` for all wrappable hooks (see `WrappableHooks`)
* // following this pattern
* function useQuery() {
*   return wrapHook('useQuery', _useQuery, options.client)(query, options);
* }
* function _useQuery(query, options) {
*   // original implementation
* }
*
* // this is what a library like `@apollo/client-react-streaming` would do
* class ApolloClientWithStreaming extends ApolloClient {
*   constructor(options) {
*     super(options);
*     this.queryManager[Symbol.for("apollo.hook.wrappers")] = {
*       useQuery: (original) => (query, options) => {
*         console.log("useQuery was called with options", options);
*         return original(query, options);
*       }
*     }
*   }
* }
*
* // this will now log the options and then call the original `useQuery`
* const client = new ApolloClientWithStreaming({ ... });
* useQuery(query, { client });
* ```
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
function wrapHook(hookName, useHook, clientOrObsQuery) {
    // Priority-wise, the later entries in this array wrap
    // previous entries and could prevent them (and in the end,
    // even the original hook) from running
    const wrapperSources = [
        clientOrObsQuery["queryManager"],
        // if we are a hook (not `preloadQuery`), we are guaranteed to be inside of
        // a React render and can use context
        hookName.startsWith("use") ?
            // eslint-disable-next-line react-hooks/rules-of-hooks
            React.useContext((0, ApolloContext_js_1.getApolloContext)())
            : undefined,
    ];
    let wrapped = useHook;
    for (const source of wrapperSources) {
        const wrapper = source?.[internal_1.wrapperSymbol]?.[hookName];
        if (wrapper) {
            wrapped = wrapper(wrapped);
        }
    }
    return wrapped;
}
//# sourceMappingURL=wrapHook.cjs.map
