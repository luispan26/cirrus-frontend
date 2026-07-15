import type { ASTNode, FieldNode } from "graphql";
/**
 * Adds `__typename` to all selection sets in the document except for the root
 * selection set.
 *
 * @param doc - The `ASTNode` to add `__typename` to
 *
 * @example
 *
 * ```ts
 * const document = gql`
 *   # ...
 * `;
 *
 * const withTypename = addTypenameToDocument(document);
 * ```
 */
export declare const addTypenameToDocument: (<TNode extends ASTNode>(doc: TNode) => TNode) & {
    added(field: FieldNode): boolean;
};
//# sourceMappingURL=transform.d.cts.map
