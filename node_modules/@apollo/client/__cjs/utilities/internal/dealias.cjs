"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dealias = dealias;
const graphql_1 = require("graphql");
// Note: this is a shallow dealias function. We might consider a future
// improvement of dealiasing all nested data. Until that need arises, we can
// keep this simple.
function dealias(fieldValue, selectionSet) {
    if (!fieldValue) {
        return fieldValue;
    }
    const data = { ...fieldValue };
    for (const selection of selectionSet.selections) {
        if (selection.kind === graphql_1.Kind.FIELD && selection.alias) {
            data[selection.name.value] = fieldValue[selection.alias.value];
            delete data[selection.alias.value];
        }
    }
    return data;
}
//# sourceMappingURL=dealias.cjs.map
