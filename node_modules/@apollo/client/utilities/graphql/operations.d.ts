import type { DocumentNode } from "@apollo/client";
/**
 * Determine if a document is a mutation document.
 *
 * @remarks
 * If you are authoring an Apollo link, you might not need this utility.
 * Prefer using the `operationType` property the `operation` object instead.
 *
 * @param document - The GraphQL document to check
 * @returns A boolean indicating if the document is a mutation operation
 *
 * @example
 *
 * ```ts
 * import { isMutationOperation } from "@apollo/client/utilities";
 *
 * const mutation = gql`
 *   mutation MyMutation {
 *     # ...
 *   }
 * `;
 *
 * isMutationOperation(mutation); // true
 * ```
 */
export declare function isMutationOperation(document: DocumentNode): boolean;
/**
 * Determine if a document is a query document.
 *
 * @remarks
 * If you are authoring an Apollo link, you might not need this utility.
 * Prefer using the `operationType` property the `operation` object instead.
 *
 * @param document - The GraphQL document to check
 * @returns A boolean indicating if the document is a query operation
 *
 * @example
 *
 * ```ts
 * import { isQueryOperation } from "@apollo/client/utilities";
 *
 * const query = gql`
 *   query MyQuery {
 *     # ...
 *   }
 * `;
 *
 * isQueryOperation(query); // true
 * ```
 */
export declare function isQueryOperation(document: DocumentNode): boolean;
/**
 * Determine if a document is a subscription document.
 *
 * @remarks
 * If you are authoring an Apollo link, you might not need this utility.
 * Prefer using the `operationType` property the `operation` object instead.
 *
 * @param document - The GraphQL document to check
 * @returns A boolean indicating if the document is a subscription operation
 *
 * @example
 *
 * ```ts
 * import { isSubscriptionOperation } from "@apollo/client/utilities";
 *
 * const subscription = gql`
 *   subscription MySubscription {
 *     # ...
 *   }
 * `;
 *
 * isSubscriptionOperation(subscription); // true
 * ```
 */
export declare function isSubscriptionOperation(document: DocumentNode): boolean;
//# sourceMappingURL=operations.d.ts.map