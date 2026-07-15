import type { DocumentNode } from "graphql";
export type DocumentTransformCacheKey = ReadonlyArray<unknown>;
type TransformFn = (document: DocumentNode) => DocumentNode;
interface DocumentTransformOptions {
    /**
     * Determines whether to cache the transformed GraphQL document. Caching can
     * speed up repeated calls to the document transform for the same input
     * document. Set to `false` to completely disable caching for the document
     * transform. When disabled, this option takes precedence over the [`getCacheKey`](#getcachekey)
     * option.
     *
     * @defaultValue `true`
     */
    cache?: boolean;
    /**
     * Defines a custom cache key for a GraphQL document that will determine whether to re-run the document transform when given the same input GraphQL document. Returns an array that defines the cache key. Return `undefined` to disable caching for that GraphQL document.
     *
     * > [!NOTE]
     * > The items in the array can be any type, but each item needs to be
     * > referentially stable to guarantee a stable cache key.
     *
     * @defaultValue `(document) => [document]`
     */
    getCacheKey?: (document: DocumentNode) => DocumentTransformCacheKey | undefined;
}
/**
 * A class for transforming GraphQL documents. See the [Document transforms
 * documentation](https://www.apollographql.com/docs/react/data/document-transforms) for more details on using them.
 *
 * @example
 *
 * ```ts
 * import { DocumentTransform } from "@apollo/client/utilities";
 * import { visit } from "graphql";
 *
 * const documentTransform = new DocumentTransform((doc) => {
 *   return visit(doc, {
 *     // ...
 *   });
 * });
 *
 * const transformedDoc = documentTransform.transformDocument(myDocument);
 * ```
 */
export declare class DocumentTransform {
    private readonly transform;
    private cached;
    private readonly resultCache;
    private getCacheKey;
    /**
     * Creates a DocumentTransform that returns the input document unchanged.
     *
     * @returns The input document
     */
    static identity(): DocumentTransform;
    /**
     * Creates a DocumentTransform that conditionally applies one of two transforms.
     *
     * @param predicate - Function that determines which transform to apply
     * @param left - Transform to apply when `predicate` returns `true`
     * @param right - Transform to apply when `predicate` returns `false`. If not provided, it defaults to `DocumentTransform.identity()`.
     * @returns A DocumentTransform that conditionally applies a document transform based on the predicate
     *
     * @example
     *
     * ```ts
     * import { isQueryOperation } from "@apollo/client/utilities";
     *
     * const conditionalTransform = DocumentTransform.split(
     *   (document) => isQueryOperation(document),
     *   queryTransform,
     *   mutationTransform
     * );
     * ```
     */
    static split(predicate: (document: DocumentNode) => boolean, left: DocumentTransform, right?: DocumentTransform): DocumentTransform & {
        left: DocumentTransform;
        right: DocumentTransform;
    };
    constructor(transform: TransformFn, options?: DocumentTransformOptions);
    /**
     * Resets the internal cache of this transform, if it is cached.
     */
    resetCache(): void;
    private performWork;
    /**
     * Transforms a GraphQL document using the configured transform function.
     *
     * @remarks
     *
     * Note that `transformDocument` caches the transformed document. Calling
     * `transformDocument` again with the already-transformed document will
     * immediately return it.
     *
     * @param document - The GraphQL document to transform
     * @returns The transformed document
     *
     * @example
     *
     * ```ts
     * const document = gql`
     *   # ...
     * `;
     *
     * const documentTransform = new DocumentTransform(transformFn);
     * const transformedDocument = documentTransform.transformDocument(document);
     * ```
     */
    transformDocument(document: DocumentNode): DocumentNode;
    /**
     * Combines this document transform with another document transform. The
     * returned document transform first applies the current document transform,
     * then applies the other document transform.
     *
     * @param otherTransform - The transform to apply after this one
     * @returns A new DocumentTransform that applies both transforms in sequence
     *
     * @example
     *
     * ```ts
     * const combinedTransform = addTypenameTransform.concat(
     *   removeDirectivesTransform
     * );
     * ```
     */
    concat(otherTransform: DocumentTransform): DocumentTransform;
    /**
    * @internal
    * Used to iterate through all transforms that are concatenations or `split` links.
    * 
    * @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
    */
    readonly left?: DocumentTransform;
    /**
    * @internal
    * Used to iterate through all transforms that are concatenations or `split` links.
    * 
    * @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
    */
    readonly right?: DocumentTransform;
}
export {};
//# sourceMappingURL=DocumentTransform.d.ts.map
