import { Observable } from "rxjs";
import { ApolloLink } from "@apollo/client/link";
import { BatchLink } from "@apollo/client/link/batch";
import type { BaseHttpLink } from "@apollo/client/link/http";
export declare namespace BaseBatchHttpLink {
    /**
     * Options passed to `BaseBatchHttpLink` through [request context](https://apollographql.com/docs/react/api/link/introduction#managing-context). Previous
     * non-terminating links in the link chain also can set these values to
     * customize the behavior of `BatchHttpLink` for each operation.
     *
     * > [!NOTE]
     * > Some of these values can also be provided to the `BaseBatchHttpLink` constructor.
     * > If a value is provided to both, the value in `context` takes precedence.
     */
    interface ContextOptions extends BaseHttpLink.ContextOptions {
    }
    /**
     * Configuration options for creating a `BaseBatchHttpLink` instance.
     *
     * > [!NOTE]
     * > Some of these options are also available to override in [request context](https://apollographql.com/docs/react/api/link/introduction#managing-context).
     * > Context options override the options passed to the constructor. Treat
     * > these options as default values that are used when the request context
     * > does not override the value.
     */
    interface Options extends BatchLink.Shared.Options, BaseHttpLink.Shared.Options {
        /**
        * The maximum number of operations to include in a single batch.
        * 
        * @defaultValue 10
        */
        batchMax?: number;
    }
}
/**
 * `BaseBatchHttpLink` is a terminating link that batches array of individual
 * GraphQL operations into a single HTTP request that's sent to a single GraphQL
 * endpoint. It serves as a base link to `BatchHttpLink`.
 *
 * @remarks
 *
 * > [!NOTE]
 * > Prefer using `BatchHttpLink` over `BaseBatchHttpLink`. Use
 * > `BaseBatchHttpLink` when you need to disable client awareness features and
 * > would like to tree-shake the implementation of `ClientAwarenessLink` out
 * > of your app bundle.
 *
 * @example
 *
 * ```ts
 * import { BaseBatchHttpLink } from "@apollo/client/link/batch-http";
 *
 * const link = new BaseBatchHttpLink({
 *   uri: "http://localhost:4000/graphql",
 *   batchMax: 5, // No more than 5 operations per batch
 *   batchInterval: 20, // Wait no more than 20ms after first batched operation
 * });
 * ```
 */
export declare class BaseBatchHttpLink extends ApolloLink {
    private batchDebounce?;
    private batchInterval;
    private batchMax;
    private batcher;
    constructor(options?: BaseBatchHttpLink.Options);
    request(operation: ApolloLink.Operation, forward: ApolloLink.ForwardFunction): Observable<ApolloLink.Result>;
}
//# sourceMappingURL=BaseBatchHttpLink.d.cts.map
