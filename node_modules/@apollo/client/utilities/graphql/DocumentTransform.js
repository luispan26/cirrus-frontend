import { WeakCache } from "@wry/caches";
import { Trie } from "@wry/trie";
import { wrap } from "optimism";
import { checkDocument } from "@apollo/client/utilities/internal";
import { invariant } from "@apollo/client/utilities/invariant";
import { cacheSizes } from "../caching/sizes.js";
function identity(document) {
    return document;
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
export class DocumentTransform {
    transform;
    cached;
    resultCache = new WeakSet();
    // This default implementation of getCacheKey can be overridden by providing
    // options.getCacheKey to the DocumentTransform constructor. In general, a
    // getCacheKey function may either return an array of keys (often including
    // the document) to be used as a cache key, or undefined to indicate the
    // transform for this document should not be cached.
    getCacheKey(document) {
        return [document];
    }
    /**
     * Creates a DocumentTransform that returns the input document unchanged.
     *
     * @returns The input document
     */
    static identity() {
        // No need to cache this transform since it just returns the document
        // unchanged. This should save a bit of memory that would otherwise be
        // needed to populate the `documentCache` of this transform.
        return new DocumentTransform(identity, { cache: false });
    }
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
    static split(predicate, left, right = DocumentTransform.identity()) {
        return Object.assign(new DocumentTransform((document) => {
            const documentTransform = predicate(document) ? left : right;
            return documentTransform.transformDocument(document);
        }, 
        // Reasonably assume both `left` and `right` transforms handle their own caching
        { cache: false }), { left, right });
    }
    constructor(transform, options = {}) {
        this.transform = transform;
        if (options.getCacheKey) {
            // Override default `getCacheKey` function, which returns [document].
            this.getCacheKey = options.getCacheKey;
        }
        this.cached = options.cache !== false;
        this.resetCache();
    }
    /**
     * Resets the internal cache of this transform, if it is cached.
     */
    resetCache() {
        if (this.cached) {
            const stableCacheKeys = new Trie();
            this.performWork = wrap(DocumentTransform.prototype.performWork.bind(this), {
                makeCacheKey: (document) => {
                    const cacheKeys = this.getCacheKey(document);
                    if (cacheKeys) {
                        invariant(Array.isArray(cacheKeys), 20);
                        return stableCacheKeys.lookupArray(cacheKeys);
                    }
                },
                max: cacheSizes["documentTransform.cache"],
                cache: (WeakCache),
            });
        }
    }
    performWork(document) {
        checkDocument(document);
        return this.transform(document);
    }
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
    transformDocument(document) {
        // If a user passes an already transformed result back to this function,
        // immediately return it.
        if (this.resultCache.has(document)) {
            return document;
        }
        const transformedDocument = this.performWork(document);
        this.resultCache.add(transformedDocument);
        return transformedDocument;
    }
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
    concat(otherTransform) {
        return Object.assign(new DocumentTransform((document) => {
            return otherTransform.transformDocument(this.transformDocument(document));
        }, 
        // Reasonably assume both transforms handle their own caching
        { cache: false }), {
            left: this,
            right: otherTransform,
        });
    }
    /**
    * @internal
    * Used to iterate through all transforms that are concatenations or `split` links.
    * 
    * @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
    */
    left;
    /**
    * @internal
    * Used to iterate through all transforms that are concatenations or `split` links.
    * 
    * @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
    */
    right;
}
//# sourceMappingURL=DocumentTransform.js.map
