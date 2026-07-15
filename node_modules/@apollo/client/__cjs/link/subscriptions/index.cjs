"use strict";
// This file is adapted from the graphql-ws npm package:
// https://github.com/enisdenjo/graphql-ws
//
// Most of the file comes from that package's README; some other parts (such as
// isLikeCloseEvent) come from its source.
//
// Here's the license of the original code:
//
// The MIT License (MIT)
//
// Copyright (c) 2020-2021 Denis Badurina
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphQLWsLink = void 0;
const rxjs_1 = require("rxjs");
const errors_1 = require("@apollo/client/errors");
const link_1 = require("@apollo/client/link");
const utilities_1 = require("@apollo/client/utilities");
const internal_1 = require("@apollo/client/utilities/internal");
// https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/close_event
function isLikeCloseEvent(val) {
    return (0, internal_1.isNonNullObject)(val) && "code" in val && "reason" in val;
}
// https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/error_event
function isLikeErrorEvent(err) {
    return (0, internal_1.isNonNullObject)(err) && err.target?.readyState === WebSocket.CLOSED;
}
/**
 * The `GraphQLWsLink` is a terminating link sends GraphQL operations over a
 * WebSocket connection using the [`graphql-ws`](https://www.npmjs.com/package/graphql-ws) library. It's used most
 * commonly with GraphQL [subscriptions](https://apollographql.com/docs/react/data/subscriptions/),
 *
 * > [!NOTE]
 * > This link works with the `graphql-ws` library. If your server uses
 * > the deprecated `subscriptions-transport-ws` library, use the deprecated
 * > [`WebSocketLink`](https://apollographql.com/docs/react/api/link/apollo-link-ws) link instead.
 *
 * @example
 *
 * ```ts
 * import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
 * import { createClient } from "graphql-ws";
 *
 * const link = new GraphQLWsLink(
 *   createClient({
 *     url: "ws://localhost:3000/subscriptions",
 *   })
 * );
 * ```
 */
class GraphQLWsLink extends link_1.ApolloLink {
    client;
    constructor(client) {
        super();
        this.client = client;
    }
    request(operation) {
        return new rxjs_1.Observable((observer) => {
            const { query, variables, operationName, extensions } = operation;
            return this.client.subscribe({ variables, operationName, extensions, query: (0, utilities_1.print)(query) }, {
                next: observer.next.bind(observer),
                complete: observer.complete.bind(observer),
                error: (err) => {
                    if (err instanceof Error) {
                        return observer.error(err);
                    }
                    const likeClose = isLikeCloseEvent(err);
                    if (likeClose || isLikeErrorEvent(err)) {
                        return observer.error(
                        // reason will be available on clean closes
                        new Error(`Socket closed${likeClose ? ` with event ${err.code}` : ""}${likeClose ? ` ${err.reason}` : ""}`));
                    }
                    return observer.error(new errors_1.CombinedGraphQLErrors({
                        errors: Array.isArray(err) ? err : [err],
                    }));
                },
                // casting around a wrong type in graphql-ws, which incorrectly expects `Sink<ExecutionResult>`
            });
        });
    }
}
exports.GraphQLWsLink = GraphQLWsLink;
//# sourceMappingURL=index.cjs.map
