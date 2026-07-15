"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeOptions = mergeOptions;
const compact_js_1 = require("./compact.cjs");
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
function mergeOptions(defaults, options) {
    return (0, compact_js_1.compact)(defaults, options, options.variables && {
        variables: (0, compact_js_1.compact)({
            ...(defaults && defaults.variables),
            ...options.variables,
        }),
    });
}
//# sourceMappingURL=mergeOptions.cjs.map
