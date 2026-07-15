"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFragmentQueryDocument = getFragmentQueryDocument;
const invariant_1 = require("@apollo/client/utilities/invariant");
/**
* Returns a query document which adds a single query operation that only
* spreads the target fragment inside of it.
*
* So for example a document of:
*
* ```graphql
* fragment foo on Foo {
*   a
*   b
*   c
* }
* ```
*
* Turns into:
*
* ```graphql
* {
*   ...foo
* }
*
* fragment foo on Foo {
*   a
*   b
*   c
* }
* ```
*
* The target fragment will either be the only fragment in the document, or a
* fragment specified by the provided `fragmentName`. If there is more than one
* fragment, but a `fragmentName` was not defined then an error will be thrown.
*
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
function getFragmentQueryDocument(document, fragmentName) {
    let actualFragmentName = fragmentName;
    // Build an array of all our fragment definitions that will be used for
    // validations. We also do some validations on the other definitions in the
    // document while building this list.
    const fragments = [];
    document.definitions.forEach((definition) => {
        // Throw an error if we encounter an operation definition because we will
        // define our own operation definition later on.
        if (definition.kind === "OperationDefinition") {
            throw (0, invariant_1.newInvariantError)(
                10,
                definition.operation,
                definition.name ? ` named '${definition.name.value}'` : ""
            );
        }
        // Add our definition to the fragments array if it is a fragment
        // definition.
        if (definition.kind === "FragmentDefinition") {
            fragments.push(definition);
        }
    });
    // If the user did not give us a fragment name then let us try to get a
    // name from a single fragment in the definition.
    if (typeof actualFragmentName === "undefined") {
        (0, invariant_1.invariant)(fragments.length === 1, 11, fragments.length);
        actualFragmentName = fragments[0].name.value;
    }
    // Generate a query document with an operation that simply spreads the
    // fragment inside of it.
    const query = {
        ...document,
        definitions: [
            {
                kind: "OperationDefinition",
                // OperationTypeNode is an enum
                operation: "query",
                selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                        {
                            kind: "FragmentSpread",
                            name: {
                                kind: "Name",
                                value: actualFragmentName,
                            },
                        },
                    ],
                },
            },
            ...document.definitions,
        ],
    };
    return query;
}
//# sourceMappingURL=getFragmentQueryDocument.cjs.map
