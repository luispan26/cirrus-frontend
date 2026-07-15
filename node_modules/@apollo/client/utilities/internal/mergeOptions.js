import { compact } from "./compact.js";
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
export function mergeOptions(defaults, options) {
    return compact(defaults, options, options.variables && {
        variables: compact({
            ...(defaults && defaults.variables),
            ...options.variables,
        }),
    });
}
//# sourceMappingURL=mergeOptions.js.map
