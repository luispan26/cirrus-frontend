"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseHttpLink = void 0;
const rxjs_1 = require("rxjs");
const link_1 = require("@apollo/client/link");
const utils_1 = require("@apollo/client/link/utils");
const utilities_1 = require("@apollo/client/utilities");
const environment_1 = require("@apollo/client/utilities/environment");
const internal_1 = require("@apollo/client/utilities/internal");
const globals_1 = require("@apollo/client/utilities/internal/globals");
const checkFetcher_js_1 = require("./checkFetcher.cjs");
const parseAndCheckHttpResponse_js_1 = require("./parseAndCheckHttpResponse.cjs");
const rewriteURIForGET_js_1 = require("./rewriteURIForGET.cjs");
const selectHttpOptionsAndBody_js_1 = require("./selectHttpOptionsAndBody.cjs");
const selectURI_js_1 = require("./selectURI.cjs");
const backupFetch = (0, globals_1.maybe)(() => fetch);
function noop() { }
/**
 * `BaseHttpLink` is a terminating link that sends a GraphQL operation to a
 * remote endpoint over HTTP. It serves as a base link to `HttpLink`.
 *
 * @remarks
 *
 * `BaseHttpLink` supports both POST and GET requests, and you can configure
 * HTTP options on a per-operation basis. You can use these options for
 * authentication, persisted queries, dynamic URIs, and other granular updates.
 *
 * > [!NOTE]
 * > Prefer using `HttpLink` over `BaseHttpLink`. Use `BaseHttpLink` when you
 * > need to disable client awareness features and would like to tree-shake
 * > the implementation of `ClientAwarenessLink` out of your app bundle.
 *
 * @example
 *
 * ```ts
 * import { BaseHttpLink } from "@apollo/client/link/http";
 *
 * const link = new BaseHttpLink({
 *   uri: "http://localhost:4000/graphql",
 *   headers: {
 *     authorization: `Bearer ${token}`,
 *   },
 * });
 * ```
 */
class BaseHttpLink extends link_1.ApolloLink {
    constructor(options = {}) {
        let { uri = "/graphql", 
        // use default global fetch if nothing passed in
        fetch: preferredFetch, print = selectHttpOptionsAndBody_js_1.defaultPrinter, includeExtensions, preserveHeaderCase, useGETForQueries, includeUnusedVariables = false, ...requestOptions } = options;
        if (environment_1.__DEV__) {
            // Make sure at least one of preferredFetch, window.fetch, or backupFetch is
            // defined, so requests won't fail at runtime.
            (0, checkFetcher_js_1.checkFetcher)(preferredFetch || backupFetch);
        }
        const linkConfig = {
            http: (0, internal_1.compact)({ includeExtensions, preserveHeaderCase }),
            options: requestOptions.fetchOptions,
            credentials: requestOptions.credentials,
            headers: requestOptions.headers,
        };
        super((operation) => {
            let chosenURI = (0, selectURI_js_1.selectURI)(operation, uri);
            const context = operation.getContext();
            const http = { ...context.http };
            if ((0, utilities_1.isSubscriptionOperation)(operation.query)) {
                http.accept = [
                    "multipart/mixed;boundary=graphql;subscriptionSpec=1.0",
                    ...(http.accept || []),
                ];
            }
            const contextConfig = {
                http,
                options: context.fetchOptions,
                credentials: context.credentials,
                headers: context.headers,
            };
            //uses fallback, link, and then context to build options
            const { options, body } = (0, selectHttpOptionsAndBody_js_1.selectHttpOptionsAndBodyInternal)(operation, print, selectHttpOptionsAndBody_js_1.fallbackHttpConfig, linkConfig, contextConfig);
            if (body.variables && !includeUnusedVariables) {
                body.variables = (0, utils_1.filterOperationVariables)(body.variables, operation.query);
            }
            let controller = new AbortController();
            let cleanupController = () => {
                controller = undefined;
            };
            if (options.signal) {
                const externalSignal = options.signal;
                // in an ideal world we could use `AbortSignal.any` here, but
                // React Native uses https://github.com/mysticatea/abort-controller as
                // a polyfill for `AbortController`, and it does not support `AbortSignal.any`.
                const listener = () => {
                    controller?.abort(externalSignal.reason);
                };
                externalSignal.addEventListener("abort", listener, { once: true });
                cleanupController = () => {
                    controller?.signal.removeEventListener("abort", cleanupController);
                    controller = undefined;
                    // on cleanup, we need to stop listening to `options.signal` to avoid memory leaks
                    externalSignal.removeEventListener("abort", listener);
                    cleanupController = noop;
                };
                // react native also does not support the addEventListener `signal` option
                // so we have to simulate that ourself
                controller.signal.addEventListener("abort", cleanupController, {
                    once: true,
                });
            }
            options.signal = controller.signal;
            if (useGETForQueries && !(0, utilities_1.isMutationOperation)(operation.query)) {
                options.method = "GET";
            }
            return new rxjs_1.Observable((observer) => {
                if (options.method === "GET") {
                    const { newURI, parseError } = (0, rewriteURIForGET_js_1.rewriteURIForGET)(chosenURI, body);
                    if (parseError) {
                        throw parseError;
                    }
                    chosenURI = newURI;
                }
                else {
                    options.body = JSON.stringify(body);
                }
                // Prefer linkOptions.fetch (preferredFetch) if provided, and otherwise
                // fall back to the *current* global window.fetch function (see issue
                // #7832), or (if all else fails) the backupFetch function we saved when
                // this module was first evaluated. This last option protects against the
                // removal of window.fetch, which is unlikely but not impossible.
                const currentFetch = preferredFetch || (0, globals_1.maybe)(() => fetch) || backupFetch;
                const observerNext = observer.next.bind(observer);
                currentFetch(chosenURI, options)
                    .then((response) => {
                    operation.setContext({ response });
                    const ctype = response.headers?.get("content-type");
                    if (ctype !== null && /^multipart\/mixed/i.test(ctype)) {
                        return (0, parseAndCheckHttpResponse_js_1.readMultipartBody)(response, observerNext);
                    }
                    else {
                        return (0, parseAndCheckHttpResponse_js_1.parseAndCheckHttpResponse)(operation)(response).then(observerNext);
                    }
                })
                    .then(() => {
                    cleanupController();
                    observer.complete();
                })
                    .catch((err) => {
                    cleanupController();
                    observer.error(err);
                });
                return () => {
                    // XXX support canceling this request
                    // https://developers.google.com/web/updates/2017/09/abortable-fetch
                    if (controller)
                        controller.abort();
                };
            });
        });
    }
}
exports.BaseHttpLink = BaseHttpLink;
//# sourceMappingURL=BaseHttpLink.cjs.map
