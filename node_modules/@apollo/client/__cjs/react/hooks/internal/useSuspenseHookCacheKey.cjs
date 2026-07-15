"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useSuspenseHookCacheKey = useSuspenseHookCacheKey;
const tslib_1 = require("tslib");
const React = tslib_1.__importStar(require("react"));
const utilities_1 = require("@apollo/client/utilities");
const constants_js_1 = require("../constants.cjs");
function useSuspenseHookCacheKey(query, options) {
    const { queryKey = [], variables } = options;
    const canonicalVariables = (0, utilities_1.canonicalStringify)(variables);
    // This state value let's us maintain the variables used for the cache key
    // when `skipToken` is used to skip a query after its been executed.
    // Since options aren't provided when using `skipToken`, `variables` would
    // otherwise disappear which means we'd return a new cache key without a
    // variables value which creates a new `ObservableQuery` instance. This was
    // particularly problematic when `refetchQueries` was used because it meant
    // refetching against an `ObservableQuery` instance that had no variables.
    let [cacheKeyVariables, setCacheKeyVariables] = React.useState(canonicalVariables);
    if (options !== constants_js_1.skipToken && cacheKeyVariables !== canonicalVariables) {
        setCacheKeyVariables((cacheKeyVariables = canonicalVariables));
    }
    return [
        query,
        cacheKeyVariables,
        ...[].concat(queryKey),
    ];
}
//# sourceMappingURL=useSuspenseHookCacheKey.cjs.map
