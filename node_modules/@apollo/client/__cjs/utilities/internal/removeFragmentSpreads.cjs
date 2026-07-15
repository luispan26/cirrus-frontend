"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeMaskedFragmentSpreads = removeMaskedFragmentSpreads;
const graphql_1 = require("graphql");
function removeMaskedFragmentSpreads(document) {
    return (0, graphql_1.visit)(document, {
        FragmentSpread(node) {
            if (!node.directives?.some(({ name }) => name.value === "unmask")) {
                return null;
            }
        },
    });
}
//# sourceMappingURL=removeFragmentSpreads.cjs.map
