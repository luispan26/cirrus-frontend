import type { DocumentNode, FragmentDefinitionNode, OperationDefinitionNode } from "graphql";
/**
 * Returns the first operation definition from a GraphQL document. The function
 * prioritizes operation definitions over fragment definitions, which makes it
 * suitable for documents that may contain both. If no operation definition is
 * found, the first fragment definition will be returned. If no definitions are
 * found, an error is thrown.
 *
 * @remarks
 *
 * Use this function when you need to perform more advanced tasks with the main
 * definition AST node. If you want to determine when a document is a specific
 * operation type, prefer the `isQueryOperation`, `isMutationOperation`, and
 * `isSubscriptionOperation` utility functions instead.
 *
 * @param queryDoc - The GraphQL document to extract the definition from
 * @returns The main operation or fragment definition AST node
 *
 * @example
 *
 * ```ts
 * import { gql } from "@apollo/client";
 * import { getMainDefinition } from "@apollo/client/utilities";
 *
 * const query = gql`
 *   query GetUser($id: ID!) {
 *     user(id: $id) {
 *       name
 *       email
 *     }
 *   }
 * `;
 *
 * const definition = getMainDefinition(query);
 * ```
 *
 * @throws When the document contains no operation or fragment definitions
 */
export declare function getMainDefinition(queryDoc: DocumentNode): OperationDefinitionNode | FragmentDefinitionNode;
//# sourceMappingURL=getMainDefinition.d.ts.map