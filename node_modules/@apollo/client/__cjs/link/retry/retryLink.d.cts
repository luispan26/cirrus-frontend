import { Observable } from "rxjs";
import type { ErrorLike } from "@apollo/client";
import { ApolloLink } from "@apollo/client/link";
export declare namespace RetryLink {
    namespace RetryLinkDocumentationTypes {
        /**
         * A function used to determine whether to retry the current operation.
         *
         * @param attempt - The current attempt number
         * @param operation - The current `ApolloLink.Operation` for the request
         * @param error - The error that triggered the retry attempt
         * @returns A boolean to indicate whether to retry the current operation
         */
        function AttemptsFunction(attempt: number, operation: ApolloLink.Operation, error: ErrorLike): boolean | Promise<boolean>;
        /**
         * A function used to determine the delay for a retry attempt.
         *
         * @param attempt - The current attempt number
         * @param operation - The current `ApolloLink.Operation` for the request
         * @param error - The error that triggered the retry attempt
         * @returns The delay in milliseconds before attempting the request again
         */
        function DelayFunction(attempt: number, operation: ApolloLink.Operation, error: ErrorLike): number;
    }
    /**
    * A function used to determine the delay for a retry attempt.
    * 
    * @param attempt - The current attempt number
    * @param operation - The current `ApolloLink.Operation` for the request
    * @param error - The error that triggered the retry attempt
    * @returns The delay in milliseconds before attempting the request again
    */
    type DelayFunction = (attempt: number, operation: ApolloLink.Operation, error: ErrorLike) => number;
    /**
     * Configuration options for the standard retry delay strategy.
     */
    interface DelayOptions {
        /**
         * The number of milliseconds to wait before attempting the first retry.
         *
         * Delays will increase exponentially for each attempt. E.g. if this is
         * set to 100, subsequent retries will be delayed by 200, 400, 800, etc,
         * until they reach the maximum delay.
         *
         * Note that if jittering is enabled, this is the average delay.
         *
         * @defaultValue `300`
         */
        initial?: number;
        /**
         * The maximum number of milliseconds that the link should wait for any
         * retry.
         *
         * @defaultValue `Infinity`
         */
        max?: number;
        /**
         * Whether delays between attempts should be randomized.
         *
         * This helps avoid [thundering herd](https://en.wikipedia.org/wiki/Thundering_herd_problem)
         * type situations by better distributing load during major outages. Without
         * these strategies, when your server comes back up it will be hit by all
         * of your clients at once, possibly causing it to go down again.
         *
         * @defaultValue `true`
         */
        jitter?: boolean;
    }
    /**
    * A function used to determine whether to retry the current operation.
    * 
    * @param attempt - The current attempt number
    * @param operation - The current `ApolloLink.Operation` for the request
    * @param error - The error that triggered the retry attempt
    * @returns A boolean to indicate whether to retry the current operation
    */
    type AttemptsFunction = (attempt: number, operation: ApolloLink.Operation, error: ErrorLike) => boolean | Promise<boolean>;
    /**
     * Configuration options for the standard retry attempt strategy.
     */
    interface AttemptsOptions {
        /**
         * The max number of times to try a single operation before giving up.
         *
         * Note that this INCLUDES the initial request as part of the count.
         * E.g. `max` of 1 indicates no retrying should occur.
         *
         * Pass `Infinity` for infinite retries.
         *
         * @defaultValue `5`
         */
        max?: number;
        /**
         * Predicate function that determines whether a particular error should
         * trigger a retry.
         *
         * For example, you may want to not retry 4xx class HTTP errors.
         *
         * @defaultValue `() => true`
         */
        retryIf?: (error: ErrorLike, operation: ApolloLink.Operation) => boolean | Promise<boolean>;
    }
    /**
     * Options provided to the `RetryLink` constructor.
     */
    interface Options {
        /**
         * Configuration for the delay strategy to use, or a custom delay strategy.
         */
        delay?: RetryLink.DelayOptions | RetryLink.DelayFunction;
        /**
         * Configuration for the retry strategy to use, or a custom retry strategy.
         */
        attempts?: RetryLink.AttemptsOptions | RetryLink.AttemptsFunction;
    }
}
/**
 * `RetryLink` is a non-terminating link that attempts to retry operations that
 * fail due to network errors. It enables resilient GraphQL operations by
 * automatically retrying failed requests with configurable delay and retry
 * strategies.
 *
 * @remarks
 *
 * `RetryLink` is particularly useful for handling unreliable network conditions
 * where you would rather wait longer than explicitly fail an operation. It
 * provides exponential backoff and jitters delays between attempts by default.
 *
 * > [!NOTE]
 * > This link does not handle retries for GraphQL errors in the response. Use
 * > `ErrorLink` to retry an operation after a GraphQL error. For more
 * > information, see the [Error handling documentation](https://apollographql.com/docs/react/data/error-handling#on-graphql-errors).
 *
 * @example
 *
 * ```ts
 * import { RetryLink } from "@apollo/client/link/retry";
 *
 * const link = new RetryLink();
 * ```
 */
export declare class RetryLink extends ApolloLink {
    private delayFor;
    private retryIf;
    constructor(options?: RetryLink.Options);
    request(operation: ApolloLink.Operation, forward: ApolloLink.ForwardFunction): Observable<ApolloLink.Result>;
}
//# sourceMappingURL=retryLink.d.cts.map
