import type { ASTNode } from "graphql";
/**
 * Converts an AST into a string, using one set of reasonable
 * formatting rules.
 *
 * @remarks This is the same function as the GraphQL.js `print` function but
 * with an added cache to avoid recomputation when encountering the same
 * `ASTNode` more than once.
 */
export declare const print: ((ast: ASTNode) => string) & {
    reset(): void;
};
//# sourceMappingURL=print.d.cts.map
