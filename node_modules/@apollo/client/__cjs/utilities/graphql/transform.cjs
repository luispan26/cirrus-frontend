"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addTypenameToDocument = void 0;
const graphql_1 = require("graphql");
const TYPENAME_FIELD = {
    kind: graphql_1.Kind.FIELD,
    name: {
        kind: graphql_1.Kind.NAME,
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
exports.addTypenameToDocument = Object.assign(function (doc) {
    return (0, graphql_1.visit)(doc, {
        SelectionSet: {
            enter(node, _key, parent) {
                // Don't add __typename to OperationDefinitions.
                if (parent &&
                    parent.kind ===
                        graphql_1.Kind.OPERATION_DEFINITION) {
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
                    return (selection.kind === graphql_1.Kind.FIELD &&
                        (selection.name.value === "__typename" ||
                            selection.name.value.lastIndexOf("__", 0) === 0));
                });
                if (skip) {
                    return;
                }
                // If this SelectionSet is @export-ed as an input variable, it should
                // not have a __typename field (see issue #4691).
                const field = parent;
                if (field.kind === graphql_1.Kind.FIELD &&
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
//# sourceMappingURL=transform.cjs.map
