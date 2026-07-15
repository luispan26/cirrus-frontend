"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasForcedResolvers = hasForcedResolvers;
const graphql_1 = require("graphql");
function hasForcedResolvers(document) {
    let forceResolvers = false;
    (0, graphql_1.visit)(document, {
        Directive: {
            enter(node) {
                if (node.name.value === "client" && node.arguments) {
                    forceResolvers = node.arguments.some((arg) => arg.name.value === "always" &&
                        arg.value.kind === "BooleanValue" &&
                        arg.value.value === true);
                    if (forceResolvers) {
                        return graphql_1.BREAK;
                    }
                }
            },
        },
    });
    return forceResolvers;
}
//# sourceMappingURL=hasForcedResolvers.cjs.map
