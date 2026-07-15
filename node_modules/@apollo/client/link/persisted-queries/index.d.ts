import type { DocumentNode, FormattedExecutionResult } from "graphql";
import type { ErrorLike } from "@apollo/client";
import { ApolloLink } from "@apollo/client/link";
export declare const VERSION = 1;
export declare namespace PersistedQueryLink {
    namespace PersistedQueryLinkDocumentationTypes {
        /**
         * A SHA-256 hash function for hashing query strings.
         *
         * @param queryString - The query string to hash
         * @returns The SHA-256 hash or a promise that resolves to the SHA-256 hash
         *
         * @example
         *
         * ```ts
         * import { sha256 } from "crypto-hash";
         *
         * const link = new PersistedQueryLink({ sha256 });
         * ```
         */
        function SHA256Function(queryString: string): string | PromiseLike<string>;
        /**
         * A function that generates a hash for a GraphQL document.
         *
         * @param document - The GraphQL document to hash
         * @returns The hash string or a promise that resolves to the hash string
         *
         * @example
         *
         * ```ts
         * import { print } from "graphql";
         * import { sha256 } from "crypto-hash";
         *
         * const link = new PersistedQueryLink({
         *   generateHash: async (document) => {
         *     const query = print(document);
         *     return sha256(query);
         *   },
         * });
         * ```
         */
        function GenerateHashFunction(document: DocumentNode): string | PromiseLike<string>;
    }
    namespace Base {
        /**
         * Base options shared between SHA256 and custom hash configurations.
         */
        interface Options {
            /**
             * A function to disable persisted queries for the current session.
             *
             * This function is called when an error occurs and determines whether
             * to disable persisted queries for all future requests in this session.
             *
             * @defaultValue Disables on `PersistedQueryNotSupported` errors
             */
            disable?: (options: PersistedQueryLink.DisableFunctionOptions) => boolean;
            /**
             * A function to determine whether to retry a request with the full query.
             *
             * When a persisted query fails, this function determines whether to
             * retry the request with the full query text included.
             *
             * @defaultValue Retries on `PersistedQueryNotSupported` or `PersistedQueryNotFound` errors
             */
            retry?: (options: PersistedQueryLink.RetryFunctionOptions) => boolean;
            /**
             * Whether to use HTTP GET for hashed queries (excluding mutations).
             *
             * > [!NOTE]
             * > If you want to use `GET` for non-mutation queries whether or not they
             * > are hashed, pass `useGETForQueries: true` option to `HttpLink`
             * > instead. If you want to use GET for all requests, pass `fetchOptions: {method: 'GET'}`
             * > to `HttpLink`.
             *
             * @defaultValue `false`
             */
            useGETForHashedQueries?: boolean;
        }
    }
    /**
     * Metadata about persisted query errors extracted from the response.
     */
    interface ErrorMeta {
        /**
         * Whether the server responded with a "PersistedQueryNotSupported" error.
         *
         * When `true`, indicates the server doesn't support persisted queries
         * or has disabled them for this client.
         */
        persistedQueryNotSupported: boolean;
        /**
         * Whether the server responded with a "PersistedQueryNotFound" error.
         *
         * When `true`, indicates the server doesn't recognize the query hash
         * and needs the full query text.
         */
        persistedQueryNotFound: boolean;
    }
    /**
    * A function that generates a hash for a GraphQL document.
    * 
    * @param document - The GraphQL document to hash
    * @returns The hash string or a promise that resolves to the hash string
    * 
    * @example
    * 
    * ```ts
    * import { print } from "graphql";
    * import { sha256 } from "crypto-hash";
    * 
    * const link = new PersistedQueryLink({
    *   generateHash: async (document) => {
    *     const query = print(document);
    *     return sha256(query);
    *   },
    * });
    * ```
    */
    type GenerateHashFunction = (document: DocumentNode) => string | PromiseLike<string>;
    /**
    * A SHA-256 hash function for hashing query strings.
    * 
    * @param queryString - The query string to hash
    * @returns The SHA-256 hash or a promise that resolves to the SHA-256 hash
    * 
    * @example
    * 
    * ```ts
    * import { sha256 } from "crypto-hash";
    * 
    * const link = new PersistedQueryLink({ sha256 });
    * ```
    */
    type SHA256Function = (queryString: string) => string | PromiseLike<string>;
    /**
     * Options for using SHA-256 hashing with persisted queries.
     *
     * Use this configuration when you want the link to handle query
     * printing and hashing using a SHA-256 function.
     */
    interface SHA256Options extends Base.Options {
        /**
         * The SHA-256 hash function to use for hashing queries. This function
         * receives the printed query string and should return a SHA-256 hash. Can
         * be synchronous or asynchronous.
         */
        sha256: PersistedQueryLink.SHA256Function;
        generateHash?: never;
    }
    /**
     * Options for using custom hash generation with persisted queries.
     *
     * Use this configuration when you need custom control over how
     * query hashes are generated (e.g., using pre-computed hashes).
     */
    interface GenerateHashOptions extends Base.Options {
        sha256?: never;
        /**
         * A custom function for generating query hashes. This function receives
         * the GraphQL document and should return a hash. Useful for custom hashing
         * strategies or when using build-time generated hashes.
         */
        generateHash: PersistedQueryLink.GenerateHashFunction;
    }
    /**
     * Configuration options for creating a `PersistedQueryLink`.
     *
     * You must provide either a `sha256` function or a custom `generateHash`
     * function, but not both.
     */
    type Options = PersistedQueryLink.SHA256Options | PersistedQueryLink.GenerateHashOptions;
    /**
     * Options passed to the `retry` function when a persisted query request
     * fails.
     */
    interface RetryFunctionOptions {
        /**
         * The error that occurred during the request.
         */
        error: ErrorLike;
        /**
         * The GraphQL operation that failed.
         */
        operation: ApolloLink.Operation;
        /**
         * Metadata about the persisted query error.
         */
        meta: PersistedQueryLink.ErrorMeta;
        /**
         * The GraphQL result, if available.
         */
        result?: FormattedExecutionResult;
    }
    /**
     * Options passed to the `disable` function when a persisted query request
     * fails.
     */
    interface DisableFunctionOptions extends PersistedQueryLink.RetryFunctionOptions {
    }
}
/**
 * @deprecated
 * Use `PersistedQueryLink` from `@apollo/client/link/persisted-queries` instead.
 */
export declare const createPersistedQueryLink: (options: PersistedQueryLink.Options) => PersistedQueryLink;
/**
 * `PersistedQueryLink` is a non-terminating link that enables the use of
 * persisted queries, a technique that reduces bandwidth by sending query hashes
 * instead of full query strings.
 *
 * @example
 *
 * ```ts
 * import { PersistedQueryLink } from "@apollo/client/link/persisted-queries";
 * import { sha256 } from "crypto-hash";
 *
 * const link = new PersistedQueryLink({
 *   sha256: (queryString) => sha256(queryString),
 * });
 * ```
 */
export declare class PersistedQueryLink extends ApolloLink {
    constructor(options: PersistedQueryLink.Options);
    resetHashCache: () => void;
}
//# sourceMappingURL=index.d.ts.map
