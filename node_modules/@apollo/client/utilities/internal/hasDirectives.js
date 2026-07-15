import { BREAK, visit } from "graphql";
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
export function hasDirectives(names, root, all) {
    const nameSet = new Set(names);
    const uniqueCount = nameSet.size;
    visit(root, {
        Directive(node) {
            if (nameSet.delete(node.name.value) && (!all || !nameSet.size)) {
                return BREAK;
            }
        },
    });
    // If we found all the names, nameSet will be empty. If we only care about
    // finding some of them, the < condition is sufficient.
    return all ? !nameSet.size : nameSet.size < uniqueCount;
}
//# sourceMappingURL=hasDirectives.js.map
