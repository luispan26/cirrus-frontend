import type { DocumentNode } from "graphql";
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
export declare function getFragmentQueryDocument(document: DocumentNode, fragmentName?: string): DocumentNode;
//# sourceMappingURL=getFragmentQueryDocument.d.ts.map
