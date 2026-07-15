// Checks the document for errors and throws an exception if there is an error.
import { Kind, visit } from "graphql";
import { __DEV__ } from "@apollo/client/utilities/environment";
import { invariant, newInvariantError, } from "@apollo/client/utilities/invariant";
import { cacheSizes } from "../caching/sizes.js";
import { getOperationName } from "./getOperationName.js";
import { memoize } from "./memoize.js";
/**
* Checks the document for errors and throws an exception if there is an error.
*
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
export const checkDocument = memoize((doc, expectedType) => {
    invariant(doc && doc.kind === "Document", 1);
    const operations = doc.definitions.filter((d) => d.kind === "OperationDefinition");
    if (__DEV__) {
        doc.definitions.forEach((definition) => {
            if (definition.kind !== "OperationDefinition" &&
                definition.kind !== "FragmentDefinition") {
                throw newInvariantError(2, definition.kind);
            }
        });
        invariant(operations.length <= 1, 3, operations.length);
    }
    if (expectedType) {
        invariant(
            operations.length == 1 && operations[0].operation === expectedType,
            4,
            expectedType,
            expectedType,
            operations[0].operation
        );
    }
    visit(doc, {
        Field(field, _, __, path) {
            if (field.alias &&
                (field.alias.value === "__typename" ||
                    field.alias.value.startsWith("__ac_")) &&
                field.alias.value !== field.name.value) {
                // not using `invariant` so path calculation only happens in error case
                let current = doc, fieldPath = [];
                for (const key of path) {
                    current = current[key];
                    if (current.kind === Kind.FIELD) {
                        fieldPath.push(current.alias?.value || current.name.value);
                    }
                }
                fieldPath.splice(-1, 1, field.name.value);
                throw newInvariantError(
                    5,
                    field.alias.value,
                    fieldPath.join("."),
                    operations[0].operation,
                    getOperationName(doc, "(anonymous)")
                );
            }
        },
    });
}, {
    max: cacheSizes["checkDocument"] || 2000 /* defaultCacheSizes["checkDocument"] */,
});
//# sourceMappingURL=checkDocument.js.map
