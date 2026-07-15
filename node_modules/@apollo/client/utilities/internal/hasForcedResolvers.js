import { BREAK, visit } from "graphql";
export function hasForcedResolvers(document) {
    let forceResolvers = false;
    visit(document, {
        Directive: {
            enter(node) {
                if (node.name.value === "client" && node.arguments) {
                    forceResolvers = node.arguments.some((arg) => arg.name.value === "always" &&
                        arg.value.kind === "BooleanValue" &&
                        arg.value.value === true);
                    if (forceResolvers) {
                        return BREAK;
                    }
                }
            },
        },
    });
    return forceResolvers;
}
//# sourceMappingURL=hasForcedResolvers.js.map