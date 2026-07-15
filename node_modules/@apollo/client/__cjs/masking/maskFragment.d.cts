import type { ApolloCache, DocumentNode, TypedDocumentNode } from "@apollo/client";
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
export declare function maskFragment<TData = unknown>(data: TData, document: TypedDocumentNode<TData> | DocumentNode, cache: ApolloCache, fragmentName?: string): TData;
//# sourceMappingURL=maskFragment.d.cts.map
