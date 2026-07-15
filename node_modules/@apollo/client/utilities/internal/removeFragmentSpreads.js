import { visit } from "graphql";
export function removeMaskedFragmentSpreads(document) {
    return visit(document, {
        FragmentSpread(node) {
            if (!node.directives?.some(({ name }) => name.value === "unmask")) {
                return null;
            }
        },
    });
}
//# sourceMappingURL=removeFragmentSpreads.js.map