"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHttpLink = exports.HttpLink = void 0;
const link_1 = require("@apollo/client/link");
const client_awareness_1 = require("@apollo/client/link/client-awareness");
const BaseHttpLink_js_1 = require("./BaseHttpLink.cjs");
/**
 * `HttpLink` is a terminating link that sends a GraphQL operation to a remote
 * endpoint over HTTP. It combines the functionality of `BaseHttpLink` and
 * `ClientAwarenessLink` into a single link.
 *
 * @remarks
 *
 * `HttpLink` supports both POST and GET requests, and you can configure HTTP
 * options on a per-operation basis. You can use these options for
 * authentication, persisted queries, dynamic URIs, and other granular updates.
 *
 * @example
 *
 * ```ts
 * import { HttpLink } from "@apollo/client";
 *
 * const link = new HttpLink({
 *   uri: "http://localhost:4000/graphql",
 *   // Additional options
 * });
 * ```
 */
class HttpLink extends link_1.ApolloLink {
    constructor(options = {}) {
        const { left, right, request } = link_1.ApolloLink.from([
            new client_awareness_1.ClientAwarenessLink(options),
            new BaseHttpLink_js_1.BaseHttpLink(options),
        ]);
        super(request);
        Object.assign(this, { left, right });
    }
}
exports.HttpLink = HttpLink;
/**
 * @deprecated
 * Use `HttpLink` from `@apollo/client/link/http` instead.
 */
const createHttpLink = (options = {}) => new HttpLink(options);
exports.createHttpLink = createHttpLink;
//# sourceMappingURL=HttpLink.cjs.map
