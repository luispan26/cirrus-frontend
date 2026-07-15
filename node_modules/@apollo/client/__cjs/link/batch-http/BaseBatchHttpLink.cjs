"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseBatchHttpLink = void 0;
const rxjs_1 = require("rxjs");
const link_1 = require("@apollo/client/link");
const batch_1 = require("@apollo/client/link/batch");
const http_1 = require("@apollo/client/link/http");
const utils_1 = require("@apollo/client/link/utils");
const environment_1 = require("@apollo/client/utilities/environment");
const internal_1 = require("@apollo/client/utilities/internal");
const globals_1 = require("@apollo/client/utilities/internal/globals");
const backupFetch = (0, globals_1.maybe)(() => fetch);
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
class BaseBatchHttpLink extends link_1.ApolloLink {
    batchDebounce;
    batchInterval;
    batchMax;
    batcher;
    constructor(options = {}) {
        super();
        let { uri = "/graphql", 
        // use default global fetch if nothing is passed in
        fetch: preferredFetch, print = http_1.defaultPrinter, includeExtensions, preserveHeaderCase, batchInterval, batchDebounce, batchMax, batchKey, includeUnusedVariables = false, ...requestOptions } = options;
        if (environment_1.__DEV__) {
            // Make sure at least one of preferredFetch, window.fetch, or backupFetch
            // is defined, so requests won't fail at runtime.
            (0, http_1.checkFetcher)(preferredFetch || backupFetch);
        }
        const linkConfig = {
            http: (0, internal_1.compact)({ includeExtensions, preserveHeaderCase }),
            options: requestOptions.fetchOptions,
            credentials: requestOptions.credentials,
            headers: requestOptions.headers,
        };
        this.batchDebounce = batchDebounce;
        this.batchInterval = batchInterval || 10;
        this.batchMax = batchMax || 10;
        const batchHandler = (operations) => {
            const chosenURI = (0, http_1.selectURI)(operations[0], uri);
            const context = operations[0].getContext();
            const contextConfig = {
                http: context.http,
                options: context.fetchOptions,
                credentials: context.credentials,
                headers: context.headers,
            };
            //uses fallback, link, and then context to build options
            const optsAndBody = operations.map((operation) => {
                const result = (0, http_1.selectHttpOptionsAndBodyInternal)(operation, print, http_1.fallbackHttpConfig, linkConfig, contextConfig);
                if (result.body.variables && !includeUnusedVariables) {
                    result.body.variables = (0, utils_1.filterOperationVariables)(result.body.variables, operation.query);
                }
                return result;
            });
            const loadedBody = optsAndBody.map(({ body }) => body);
            const options = optsAndBody[0].options;
            // There's no spec for using GET with batches.
            if (options.method === "GET") {
                return (0, rxjs_1.throwError)(() => new Error("apollo-link-batch-http does not support GET requests"));
            }
            try {
                options.body = JSON.stringify(loadedBody);
            }
            catch (parseError) {
                return (0, rxjs_1.throwError)(() => parseError);
            }
            let controller;
            if (!options.signal && typeof AbortController !== "undefined") {
                controller = new AbortController();
                options.signal = controller.signal;
            }
            return new rxjs_1.Observable((observer) => {
                // Prefer BatchHttpLink.Options.fetch (preferredFetch) if provided, and
                // otherwise fall back to the *current* global window.fetch function
                // (see issue #7832), or (if all else fails) the backupFetch function we
                // saved when this module was first evaluated. This last option protects
                // against the removal of window.fetch, which is unlikely but not
                // impossible.
                const currentFetch = preferredFetch || (0, globals_1.maybe)(() => fetch) || backupFetch;
                currentFetch(chosenURI, options)
                    .then((response) => {
                    // Make the raw response available in the context.
                    operations.forEach((operation) => operation.setContext({ response }));
                    return response;
                })
                    .then((0, http_1.parseAndCheckHttpResponse)(operations))
                    .then((result) => {
                    controller = undefined;
                    // we have data and can send it to back up the link chain
                    observer.next(result);
                    observer.complete();
                    return result;
                })
                    .catch((err) => {
                    controller = undefined;
                    observer.error(err);
                });
                return () => {
                    // XXX support canceling this request
                    // https://developers.google.com/web/updates/2017/09/abortable-fetch
                    if (controller)
                        controller.abort();
                };
            });
        };
        batchKey =
            batchKey ||
                ((operation) => {
                    const context = operation.getContext();
                    const contextConfig = {
                        http: context.http,
                        options: context.fetchOptions,
                        credentials: context.credentials,
                        headers: context.headers,
                    };
                    //may throw error if config not serializable
                    return (0, http_1.selectURI)(operation, uri) + JSON.stringify(contextConfig);
                });
        this.batcher = new batch_1.BatchLink({
            batchDebounce: this.batchDebounce,
            batchInterval: this.batchInterval,
            batchMax: this.batchMax,
            batchKey,
            batchHandler,
        });
    }
    request(operation, forward) {
        return this.batcher.request(operation, forward);
    }
}
exports.BaseBatchHttpLink = BaseBatchHttpLink;
//# sourceMappingURL=BaseBatchHttpLink.cjs.map
