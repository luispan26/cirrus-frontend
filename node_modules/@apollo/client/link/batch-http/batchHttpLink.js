import { ApolloLink } from "@apollo/client/link";
import { ClientAwarenessLink } from "@apollo/client/link/client-awareness";
import { BaseBatchHttpLink } from "./BaseBatchHttpLink.js";
/**
 * `BatchHttpLink` is a terminating link that batches array of individual
 * GraphQL operations into a single HTTP request that's sent to a single GraphQL
 * endpoint. It combines the functionality of `BaseBatchHttpLink` and
 * `ClientAwarenessLink` into a single link.
 *
 * @remarks
 *
 * If you use `BatchHttpLink` instead of `HttpLink` as your terminating link,
 * Apollo Client automatically batches executed GraphQL operations and transmits
 * them to your server according to the batching options you provide.
 *
 * @example
 *
 * ```ts
 * import { BatchHttpLink } from "@apollo/client/link/batch-http";
 *
 * const link = new BatchHttpLink({
 *   uri: "http://localhost:4000/graphql",
 *   batchMax: 5, // No more than 5 operations per batch
 *   batchInterval: 20, // Wait no more than 20ms after first batched operation
 * });
 * ```
 */
export class BatchHttpLink extends ApolloLink {
    constructor(options = {}) {
        const { left, right, request } = ApolloLink.from([
            new ClientAwarenessLink(options),
            new BaseBatchHttpLink(options),
        ]);
        super(request);
        Object.assign(this, { left, right });
    }
}
//# sourceMappingURL=batchHttpLink.js.map