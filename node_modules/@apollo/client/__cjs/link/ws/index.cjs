"use strict";;
const {
    __DEV__
} = require("@apollo/client/utilities/environment");

Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketLink = void 0;
const rxjs_1 = require("rxjs");
const subscriptions_transport_ws_1 = require("subscriptions-transport-ws");
const link_1 = require("@apollo/client/link");
const environment_1 = require("@apollo/client/utilities/environment");
const invariant_1 = require("@apollo/client/utilities/invariant");
/**
 * `WebSocketLink` is a terminating link that executes GraphQL operations over
 * WebSocket connections using the `subscriptions-transport-ws` library. It's
 * primarily used for GraphQL subscriptions but can also handle queries and
 * mutations.
 *
 * @example
 *
 * ```ts
 * import { WebSocketLink } from "@apollo/client/link/ws";
 * import { SubscriptionClient } from "subscriptions-transport-ws";
 *
 * const wsLink = new WebSocketLink(
 *   new SubscriptionClient("ws://localhost:4000/subscriptions", {
 *     reconnect: true,
 *   })
 * );
 * ```
 *
 * @deprecated `WebSocketLink` uses the deprecated and unmaintained
 * `subscriptions-transport-ws` library. This link is no longer maintained and
 * will be removed in a future major version of Apollo Client. We recommend
 * switching to `GraphQLWsLink`, which uses the [`graphql-ws` library](https://the-guild.dev/graphql/ws) to
 * send GraphQL operations through WebSocket connections.
 */
class WebSocketLink extends link_1.ApolloLink {
    subscriptionClient;
    constructor(paramsOrClient) {
        super();
        if (environment_1.__DEV__) {
            __DEV__ && invariant_1.invariant.warn(58);
        }
        if (paramsOrClient instanceof subscriptions_transport_ws_1.SubscriptionClient) {
            this.subscriptionClient = paramsOrClient;
        }
        else {
            this.subscriptionClient = new subscriptions_transport_ws_1.SubscriptionClient(paramsOrClient.uri, paramsOrClient.options, paramsOrClient.webSocketImpl);
        }
    }
    request(operation) {
        return new rxjs_1.Observable((observer) => {
            const subscription = this.subscriptionClient
                .request(operation)
                .subscribe(observer);
            return () => {
                subscription.unsubscribe();
            };
        });
    }
}
exports.WebSocketLink = WebSocketLink;
//# sourceMappingURL=index.cjs.map
