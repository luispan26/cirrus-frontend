import { print as origPrint } from "graphql";
import { __DEV__ } from "@apollo/client/utilities/environment";
import { AutoCleanedWeakCache, registerGlobalCache, } from "@apollo/client/utilities/internal";
import { cacheSizes } from "../caching/index.js";
let printCache;
/**
 * Converts an AST into a string, using one set of reasonable
 * formatting rules.
 *
 * @remarks This is the same function as the GraphQL.js `print` function but
 * with an added cache to avoid recomputation when encountering the same
 * `ASTNode` more than once.
 */
export const print = Object.assign((ast) => {
    let result = printCache.get(ast);
    if (!result) {
        result = origPrint(ast);
        printCache.set(ast, result);
    }
    return result;
}, {
    reset() {
        printCache = new AutoCleanedWeakCache(cacheSizes.print || 2000 /* defaultCacheSizes.print */);
    },
});
print.reset();
if (__DEV__) {
    registerGlobalCache("print", () => (printCache ? printCache.size : 0));
}
//# sourceMappingURL=print.js.map