"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasDirectives = hasDirectives;
const graphql_1 = require("graphql");
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
function hasDirectives(names, root, all) {
    const nameSet = new Set(names);
    const uniqueCount = nameSet.size;
    (0, graphql_1.visit)(root, {
        Directive(node) {
            if (nameSet.delete(node.name.value) && (!all || !nameSet.size)) {
                return graphql_1.BREAK;
            }
        },
    });
    // If we found all the names, nameSet will be empty. If we only care about
    // finding some of them, the < condition is sufficient.
    return all ? !nameSet.size : nameSet.size < uniqueCount;
}
//# sourceMappingURL=hasDirectives.cjs.map
