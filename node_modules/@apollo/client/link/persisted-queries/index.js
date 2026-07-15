import { Observable } from "rxjs";
import { CombinedGraphQLErrors, ServerError, toErrorLike, } from "@apollo/client/errors";
import { ApolloLink } from "@apollo/client/link";
import { print } from "@apollo/client/utilities";
import { cacheSizes, isFormattedExecutionResult, } from "@apollo/client/utilities";
import { __DEV__ } from "@apollo/client/utilities/environment";
import { AutoCleanedWeakCache, compact, isNonEmptyArray, } from "@apollo/client/utilities/internal";
import { invariant } from "@apollo/client/utilities/invariant";
export const VERSION = 1;
function processErrors(graphQLErrors) {
    const byMessage = {}, byCode = {};
    if (isNonEmptyArray(graphQLErrors)) {
        graphQLErrors.forEach((error) => {
            byMessage[error.message] = error;
            if (typeof error.extensions?.code == "string")
                byCode[error.extensions.code] = error;
        });
    }
    return {
        persistedQueryNotSupported: !!(byMessage.PersistedQueryNotSupported ||
            byCode.PERSISTED_QUERY_NOT_SUPPORTED),
        persistedQueryNotFound: !!(byMessage.PersistedQueryNotFound || byCode.PERSISTED_QUERY_NOT_FOUND),
    };
}
const defaultOptions = {
    disable: ({ meta }) => meta.persistedQueryNotSupported,
    retry: ({ meta }) => meta.persistedQueryNotSupported || meta.persistedQueryNotFound,
    useGETForHashedQueries: false,
};
function operationDefinesMutation(operation) {
    return operation.query.definitions.some((d) => d.kind === "OperationDefinition" && d.operation === "mutation");
}
/**
 * @deprecated
 * Use `PersistedQueryLink` from `@apollo/client/link/persisted-queries` instead.
 */
export const createPersistedQueryLink = (options) => new PersistedQueryLink(options);
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
export class PersistedQueryLink extends ApolloLink {
    constructor(options) {
        let hashesByQuery;
        function resetHashCache() {
            hashesByQuery = undefined;
        }
        // Ensure a SHA-256 hash function is provided, if a custom hash
        // generation function is not provided. We don't supply a SHA-256 hash
        // function by default, to avoid forcing one as a dependency. Developers
        // should pick the most appropriate SHA-256 function (sync or async) for
        // their needs/environment, or provide a fully custom hash generation
        // function (via the `generateHash` option) if they want to handle
        // hashing with something other than SHA-256.
        invariant(options &&
            (typeof options.sha256 === "function" ||
                typeof options.generateHash === "function"), 59);
        const { sha256, 
        // If both a `sha256` and `generateHash` option are provided, the
        // `sha256` option will be ignored. Developers can configure and
        // use any hashing approach they want in a custom `generateHash`
        // function; they aren't limited to SHA-256.
        generateHash = (query) => Promise.resolve(sha256(print(query))), disable, retry, useGETForHashedQueries, } = compact(defaultOptions, options);
        let enabled = true;
        const getHashPromise = (query) => new Promise((resolve) => resolve(generateHash(query)));
        function getQueryHash(query) {
            if (!query || typeof query !== "object") {
                // If the query is not an object, we won't be able to store its hash as
                // a property of query[hashesKey], so we let generateHash(query) decide
                // what to do with the bogus query.
                return getHashPromise(query);
            }
            if (!hashesByQuery) {
                hashesByQuery = new AutoCleanedWeakCache(cacheSizes["PersistedQueryLink.persistedQueryHashes"] ||
                    2000 /* defaultCacheSizes["PersistedQueryLink.persistedQueryHashes"] */);
            }
            let hash = hashesByQuery.get(query);
            if (!hash)
                hashesByQuery.set(query, (hash = getHashPromise(query)));
            return hash;
        }
        super((operation, forward) => {
            invariant(forward, 60);
            const { query } = operation;
            return new Observable((observer) => {
                let subscription;
                let retried = false;
                let originalFetchOptions;
                let setFetchOptions = false;
                function handleRetry(options, cb) {
                    if (retried) {
                        return cb();
                    }
                    retried = true;
                    // if the server doesn't support persisted queries, don't try anymore
                    enabled = !disable(options);
                    if (!enabled) {
                        delete operation.extensions.persistedQuery;
                        // clear hashes from cache, we don't need them anymore
                        resetHashCache();
                    }
                    // if its not found, we can try it again, otherwise just report the error
                    if (retry(options)) {
                        // need to recall the link chain
                        if (subscription)
                            subscription.unsubscribe();
                        // actually send the query this time
                        operation.setContext(({ http: prevHttp, fetchOptions: prevFetchOptions }) => ({
                            http: {
                                ...prevHttp,
                                includeQuery: true,
                                ...(enabled ? { includeExtensions: true } : {}),
                            },
                            fetchOptions: {
                                // Since we're including the full query, which may be
                                // large, we should send it in the body of a POST request.
                                // See issue #7456.
                                ...prevFetchOptions,
                                method: "POST",
                            },
                        }));
                        if (setFetchOptions) {
                            operation.setContext({ fetchOptions: originalFetchOptions });
                        }
                        subscription = forward(operation).subscribe(handler);
                        return;
                    }
                    cb();
                }
                const handler = {
                    next: (result) => {
                        if (!isFormattedExecutionResult(result) || !result.errors) {
                            return observer.next(result);
                        }
                        handleRetry({
                            operation,
                            error: new CombinedGraphQLErrors(result),
                            meta: processErrors(result.errors),
                            result,
                        }, () => observer.next(result));
                    },
                    error: (incomingError) => {
                        const error = toErrorLike(incomingError);
                        const callback = () => observer.error(incomingError);
                        // This is persisted-query specific (see #9410) and deviates from the
                        // GraphQL-over-HTTP spec for application/json responses.
                        // This is intentional.
                        if (ServerError.is(error) && error.bodyText) {
                            try {
                                const result = JSON.parse(error.bodyText);
                                if (isFormattedExecutionResult(result)) {
                                    return handleRetry({
                                        error: new CombinedGraphQLErrors(result),
                                        result,
                                        operation,
                                        meta: processErrors(result.errors),
                                    }, callback);
                                }
                            }
                            catch { }
                        }
                        handleRetry({
                            error,
                            operation,
                            meta: {
                                persistedQueryNotSupported: false,
                                persistedQueryNotFound: false,
                            },
                        }, callback);
                    },
                    complete: observer.complete.bind(observer),
                };
                // don't send the query the first time
                operation.setContext(({ http: prevHttp }) => ({
                    http: enabled ?
                        { ...prevHttp, includeQuery: false, includeExtensions: true }
                        : prevHttp,
                }));
                // If requested, set method to GET if there are no mutations. Remember the
                // original fetchOptions so we can restore them if we fall back to a
                // non-hashed request.
                if (useGETForHashedQueries &&
                    enabled &&
                    !operationDefinesMutation(operation)) {
                    operation.setContext(({ fetchOptions = {} }) => {
                        originalFetchOptions = fetchOptions;
                        return {
                            fetchOptions: {
                                ...fetchOptions,
                                method: "GET",
                            },
                        };
                    });
                    setFetchOptions = true;
                }
                if (enabled) {
                    getQueryHash(query)
                        .then((sha256Hash) => {
                        operation.extensions.persistedQuery = {
                            version: VERSION,
                            sha256Hash,
                        };
                        subscription = forward(operation).subscribe(handler);
                    })
                        .catch(observer.error.bind(observer));
                }
                else {
                    subscription = forward(operation).subscribe(handler);
                }
                return () => {
                    if (subscription)
                        subscription.unsubscribe();
                };
            });
        });
        if (__DEV__) {
            Object.assign(this, {
                getMemoryInternals() {
                    return {
                        PersistedQueryLink: {
                            persistedQueryHashes: hashesByQuery?.size ?? 0,
                        },
                    };
                },
            });
        }
        this.resetHashCache = resetHashCache;
    }
    resetHashCache;
}
//# sourceMappingURL=index.js.map
