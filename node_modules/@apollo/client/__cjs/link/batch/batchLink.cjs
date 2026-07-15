"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchLink = void 0;
const rxjs_1 = require("rxjs");
const link_1 = require("@apollo/client/link");
const batching_js_1 = require("./batching.cjs");
/**
 * `BatchLink` is a non-terminating link that provides the core batching
 * functionality for grouping multiple GraphQL operations into batches based
 * on configurable timing and key-based grouping strategies. It serves as a base
 * link to `BatchHttpLink`.
 *
 * @remarks
 *
 * > [!NOTE]
 * > You will not generally use `BatchLink` on your own unless you need to
 * > provide batching capabilities to third-party terminating links. Prefer
 * > using `BatchHttpLink` to batch GraphQL operations over HTTP.
 *
 * @example
 *
 * ```ts
 * import { BatchLink } from "@apollo/client/link/batch";
 *
 * const link = new BatchLink({
 *   batchInterval: 20,
 *   batchMax: 5,
 *   batchHandler: (operations, forwards) => {
 *     // Custom logic to process batch of operations
 *     return handleBatch(operations, forwards);
 *   },
 * });
 * ```
 */
class BatchLink extends link_1.ApolloLink {
    batcher;
    constructor(options) {
        super();
        const { batchDebounce, batchInterval = 10, batchMax = 0, batchHandler = () => rxjs_1.EMPTY, batchKey = () => "", } = options || {};
        this.batcher = new batching_js_1.OperationBatcher({
            batchDebounce,
            batchInterval,
            batchMax,
            batchHandler,
            batchKey,
        });
    }
    request(operation, forward) {
        return this.batcher.enqueueRequest({ operation, forward });
    }
}
exports.BatchLink = BatchLink;
//# sourceMappingURL=batchLink.cjs.map
