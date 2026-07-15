"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchHttpLink = void 0;
const link_1 = require("@apollo/client/link");
const client_awareness_1 = require("@apollo/client/link/client-awareness");
const BaseBatchHttpLink_js_1 = require("./BaseBatchHttpLink.cjs");
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
class BatchHttpLink extends link_1.ApolloLink {
    constructor(options = {}) {
        const { left, right, request } = link_1.ApolloLink.from([
            new client_awareness_1.ClientAwarenessLink(options),
            new BaseBatchHttpLink_js_1.BaseBatchHttpLink(options),
        ]);
        super(request);
        Object.assign(this, { left, right });
    }
}
exports.BatchHttpLink = BatchHttpLink;
//# sourceMappingURL=batchHttpLink.cjs.map
