"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.print = void 0;
const graphql_1 = require("graphql");
const environment_1 = require("@apollo/client/utilities/environment");
const internal_1 = require("@apollo/client/utilities/internal");
const index_js_1 = require("../caching/index.cjs");
let printCache;
/**
 * Converts an AST into a string, using one set of reasonable
 * formatting rules.
 *
 * @remarks This is the same function as the GraphQL.js `print` function but
 * with an added cache to avoid recomputation when encountering the same
 * `ASTNode` more than once.
 */
exports.print = Object.assign((ast) => {
    let result = printCache.get(ast);
    if (!result) {
        result = (0, graphql_1.print)(ast);
        printCache.set(ast, result);
    }
    return result;
}, {
    reset() {
        printCache = new internal_1.AutoCleanedWeakCache(index_js_1.cacheSizes.print || 2000 /* defaultCacheSizes.print */);
    },
});
exports.print.reset();
if (environment_1.__DEV__) {
    (0, internal_1.registerGlobalCache)("print", () => (printCache ? printCache.size : 0));
}
//# sourceMappingURL=print.cjs.map
