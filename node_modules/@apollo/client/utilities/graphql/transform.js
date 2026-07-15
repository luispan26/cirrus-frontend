import { Kind, visit } from "graphql";
const TYPENAME_FIELD = {
    kind: Kind.FIELD,
    name: {
        kind: Kind.NAME,
        value: "__typename",
    },
};
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
export const addTypenameToDocument = Object.assign(function (doc) {
    return visit(doc, {
        SelectionSet: {
            enter(node, _key, parent) {
                // Don't add __typename to OperationDefinitions.
                if (parent &&
                    parent.kind ===
                        Kind.OPERATION_DEFINITION) {
                    return;
                }
                // No changes if no selections.
                const { selections } = node;
                if (!selections) {
                    return;
                }
                // If selections already have a __typename, or are part of an
                // introspection query, do nothing.
                const skip = selections.some((selection) => {
                    return (selection.kind === Kind.FIELD &&
                        (selection.name.value === "__typename" ||
                            selection.name.value.lastIndexOf("__", 0) === 0));
                });
                if (skip) {
                    return;
                }
                // If this SelectionSet is @export-ed as an input variable, it should
                // not have a __typename field (see issue #4691).
                const field = parent;
                if (field.kind === Kind.FIELD &&
                    field.directives &&
                    field.directives.some((d) => d.name.value === "export")) {
                    return;
                }
                // Create and return a new SelectionSet with a __typename Field.
                return {
                    ...node,
                    selections: [...selections, TYPENAME_FIELD],
                };
            },
        },
    });
}, {
    added(field) {
        return field === TYPENAME_FIELD;
    },
});
//# sourceMappingURL=transform.js.map