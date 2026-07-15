import { visit } from "graphql";
export function filterOperationVariables(variables, query) {
    const result = { ...variables };
    const unusedNames = new Set(Object.keys(variables));
    visit(query, {
        Variable(node, _key, parent) {
            // A variable type definition at the top level of a query is not
            // enough to silence server-side errors about the variable being
            // unused, so variable definitions do not count as usage.
            // https://spec.graphql.org/draft/#sec-All-Variables-Used
            if (parent &&
                parent.kind !== "VariableDefinition") {
                unusedNames.delete(node.name.value);
            }
        },
    });
    unusedNames.forEach((name) => {
        delete result[name];
    });
    return result;
}
//# sourceMappingURL=filterOperationVariables.js.map