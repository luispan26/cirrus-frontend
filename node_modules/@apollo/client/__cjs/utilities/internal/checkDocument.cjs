"use strict";
// Checks the document for errors and throws an exception if there is an error.
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkDocument = void 0;
const graphql_1 = require("graphql");
const environment_1 = require("@apollo/client/utilities/environment");
const invariant_1 = require("@apollo/client/utilities/invariant");
const sizes_js_1 = require("../caching/sizes.cjs");
const getOperationName_js_1 = require("./getOperationName.cjs");
const memoize_js_1 = require("./memoize.cjs");
/**
* Checks the document for errors and throws an exception if there is an error.
*
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
exports.checkDocument = (0, memoize_js_1.memoize)((doc, expectedType) => {
    (0, invariant_1.invariant)(doc && doc.kind === "Document", 1);
    const operations = doc.definitions.filter((d) => d.kind === "OperationDefinition");
    if (environment_1.__DEV__) {
        doc.definitions.forEach((definition) => {
            if (definition.kind !== "OperationDefinition" &&
                definition.kind !== "FragmentDefinition") {
                throw (0, invariant_1.newInvariantError)(2, definition.kind);
            }
        });
        (0, invariant_1.invariant)(operations.length <= 1, 3, operations.length);
    }
    if (expectedType) {
        (0, invariant_1.invariant)(
            operations.length == 1 && operations[0].operation === expectedType,
            4,
            expectedType,
            expectedType,
            operations[0].operation
        );
    }
    (0, graphql_1.visit)(doc, {
        Field(field, _, __, path) {
            if (field.alias &&
                (field.alias.value === "__typename" ||
                    field.alias.value.startsWith("__ac_")) &&
                field.alias.value !== field.name.value) {
                // not using `invariant` so path calculation only happens in error case
                let current = doc, fieldPath = [];
                for (const key of path) {
                    current = current[key];
                    if (current.kind === graphql_1.Kind.FIELD) {
                        fieldPath.push(current.alias?.value || current.name.value);
                    }
                }
                fieldPath.splice(-1, 1, field.name.value);
                throw (0, invariant_1.newInvariantError)(
                    5,
                    field.alias.value,
                    fieldPath.join("."),
                    operations[0].operation,
                    (0, getOperationName_js_1.getOperationName)(doc, "(anonymous)")
                );
            }
        },
    });
}, {
    max: sizes_js_1.cacheSizes["checkDocument"] || 2000 /* defaultCacheSizes["checkDocument"] */,
});
//# sourceMappingURL=checkDocument.cjs.map
