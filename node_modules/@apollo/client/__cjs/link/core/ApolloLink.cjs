"use strict";;
const {
    __DEV__
} = require("@apollo/client/utilities/environment");

Object.defineProperty(exports, "__esModule", { value: true });
exports.ApolloLink = void 0;
const rxjs_1 = require("rxjs");
const utils_1 = require("@apollo/client/link/utils");
const environment_1 = require("@apollo/client/utilities/environment");
const invariant_1 = require("@apollo/client/utilities/invariant");
/**
 * The base class for all links in Apollo Client. A link represents either a
 * self-contained modification to a GraphQL operation or a side effect (such as
 * logging).
 *
 * @remarks
 *
 * Links enable you to customize Apollo Client's request flow by composing
 * together different pieces of functionality into a chain of links. Each
 * link represents a specific capability, such as adding authentication headers,
 * retrying failed requests, batching operations, or sending requests to a
 * GraphQL server.
 *
 * Every link must define a request handler via its constructor or by extending
 * this class and implementing the `request` method.
 *
 * @example
 *
 * ```ts
 * import { ApolloLink } from "@apollo/client";
 *
 * const link = new ApolloLink((operation, forward) => {
 *   console.log("Operation:", operation.operationName);
 *   return forward(operation);
 * });
 * ```
 */
class ApolloLink {
    /**
     * Creates a link that completes immediately and does not emit a result.
     *
     * @example
     *
     * ```ts
     * const link = ApolloLink.empty();
     * ```
     */
    static empty() {
        return new ApolloLink(() => rxjs_1.EMPTY);
    }
    /**
     * Composes multiple links into a single composed link that executes each
     * provided link in serial order.
     *
     * @example
     *
     * ```ts
     * import { from, HttpLink, ApolloLink } from "@apollo/client";
     * import { RetryLink } from "@apollo/client/link/retry";
     * import MyAuthLink from "../auth";
     *
     * const link = ApolloLink.from([
     *   new RetryLink(),
     *   new MyAuthLink(),
     *   new HttpLink({ uri: "http://localhost:4000/graphql" }),
     * ]);
     * ```
     *
     * @param links - An array of `ApolloLink` instances or request handlers that
     * are executed in serial order.
     */
    static from(links) {
        if (links.length === 0)
            return ApolloLink.empty();
        const [first, ...rest] = links;
        return first.concat(...rest);
    }
    /**
     * Creates a link that conditionally routes a request to different links.
     *
     * @example
     *
     * ```ts
     * import { ApolloLink, HttpLink } from "@apollo/client";
     *
     * const link = ApolloLink.split(
     *   (operation) => operation.getContext().version === 1,
     *   new HttpLink({ uri: "http://localhost:4000/v1/graphql" }),
     *   new HttpLink({ uri: "http://localhost:4000/v2/graphql" })
     * );
     * ```
     *
     * @param test - A predicate function that receives the current `operation`
     * and returns a boolean indicating which link to execute. Returning `true`
     * executes the `left` link. Returning `false` executes the `right` link.
     *
     * @param left - The link that executes when the `test` function returns
     * `true`.
     *
     * @param right - The link that executes when the `test` function returns
     * `false`. If the `right` link is not provided, the request is forwarded to
     * the next link in the chain.
     */
    static split(test, left, right = new ApolloLink((op, forward) => forward(op))) {
        const link = new ApolloLink((operation, forward) => {
            const result = test(operation);
            if (environment_1.__DEV__) {
                if (typeof result !== "boolean") {
                    __DEV__ && invariant_1.invariant.warn(63, result);
                }
            }
            return result ?
                left.request(operation, forward)
                : right.request(operation, forward);
        });
        return Object.assign(link, { left, right });
    }
    /**
     * Executes a GraphQL request against a link. The `execute` function begins
     * the request by calling the request handler of the link.
     *
     * @example
     *
     * ```ts
     * const observable = ApolloLink.execute(link, { query, variables }, { client });
     *
     * observable.subscribe({
     *   next(value) {
     *     console.log("Received", value);
     *   },
     *   error(error) {
     *     console.error("Oops got error", error);
     *   },
     *   complete() {
     *     console.log("Request complete");
     *   },
     * });
     * ```
     *
     * @param link - The `ApolloLink` instance to execute the request.
     *
     * @param request - The GraphQL request details, such as the `query` and
     * `variables`.
     *
     * @param context - The execution context for the request, such as the
     * `client` making the request.
     */
    static execute(link, request, context) {
        return link.request((0, utils_1.createOperation)(request, context), () => {
            if (environment_1.__DEV__) {
                __DEV__ && invariant_1.invariant.warn(64);
            }
            return rxjs_1.EMPTY;
        });
    }
    /**
     * Combines multiple links into a single composed link.
     *
     * @example
     *
     * ```ts
     * const link = ApolloLink.concat(firstLink, secondLink, thirdLink);
     * ```
     *
     * @param links - The links to concatenate into a single link. Each link will
     * execute in serial order.
     *
     * @deprecated Use `ApolloLink.from` instead. `ApolloLink.concat` will be
     * removed in a future major version.
     */
    static concat(...links) {
        return ApolloLink.from(links);
    }
    constructor(request) {
        if (request)
            this.request = request;
    }
    /**
     * Concatenates a link that conditionally routes a request to different links.
     *
     * @example
     *
     * ```ts
     * import { ApolloLink, HttpLink } from "@apollo/client";
     *
     * const previousLink = new ApolloLink((operation, forward) => {
     *   // Handle the request
     *
     *   return forward(operation);
     * });
     *
     * const link = previousLink.split(
     *   (operation) => operation.getContext().version === 1,
     *   new HttpLink({ uri: "http://localhost:4000/v1/graphql" }),
     *   new HttpLink({ uri: "http://localhost:4000/v2/graphql" })
     * );
     * ```
     *
     * @param test - A predicate function that receives the current `operation`
     * and returns a boolean indicating which link to execute. Returning `true`
     * executes the `left` link. Returning `false` executes the `right` link.
     *
     * @param left - The link that executes when the `test` function returns
     * `true`.
     *
     * @param right - The link that executes when the `test` function returns
     * `false`. If the `right` link is not provided, the request is forwarded to
     * the next link in the chain.
     */
    split(test, left, right) {
        return this.concat(ApolloLink.split(test, left, right));
    }
    /**
     * Combines the link with other links into a single composed link.
     *
     * @example
     *
     * ```ts
     * import { ApolloLink, HttpLink } from "@apollo/client";
     *
     * const previousLink = new ApolloLink((operation, forward) => {
     *   // Handle the request
     *
     *   return forward(operation);
     * });
     *
     * const link = previousLink.concat(
     *   link1,
     *   link2,
     *   new HttpLink({ uri: "http://localhost:4000/graphql" })
     * );
     * ```
     */
    concat(...links) {
        if (links.length === 0) {
            return this;
        }
        return links.reduce(this.combine.bind(this), this);
    }
    combine(left, right) {
        const link = new ApolloLink((operation, forward) => {
            return left.request(operation, (op) => right.request(op, forward));
        });
        return Object.assign(link, { left, right });
    }
    /**
     * Runs the request handler for the provided operation.
     *
     * > [!NOTE]
     * > This is called by the `ApolloLink.execute` function for you and should
     * > not be called directly. Prefer using `ApolloLink.execute` to make the
     * > request instead.
     */
    request(operation, forward) {
        throw (0, invariant_1.newInvariantError)(65);
    }
    /**
    * @internal
    * Used to iterate through all links that are concatenations or `split` links.
    * 
    * @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
    */
    left;
    /**
    * @internal
    * Used to iterate through all links that are concatenations or `split` links.
    * 
    * @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
    */
    right;
}
exports.ApolloLink = ApolloLink;
//# sourceMappingURL=ApolloLink.cjs.map
