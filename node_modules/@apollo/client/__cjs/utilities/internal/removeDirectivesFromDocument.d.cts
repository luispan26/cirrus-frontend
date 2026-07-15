import type { DirectiveNode, DocumentNode } from "graphql";
type RemoveDirectiveConfig = {
    name?: string;
    test?: (node: DirectiveNode) => boolean;
    remove?: boolean;
};
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
export declare function removeDirectivesFromDocument(directives: RemoveDirectiveConfig[], doc: DocumentNode): DocumentNode | null;
export {};
//# sourceMappingURL=removeDirectivesFromDocument.d.cts.map
