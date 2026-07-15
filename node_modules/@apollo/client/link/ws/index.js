import { Observable } from "rxjs";
import { SubscriptionClient } from "subscriptions-transport-ws";
import { ApolloLink } from "@apollo/client/link";
import { __DEV__ } from "@apollo/client/utilities/environment";
import { invariant } from "@apollo/client/utilities/invariant";
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
export class WebSocketLink extends ApolloLink {
    subscriptionClient;
    constructor(paramsOrClient) {
        super();
        if (__DEV__) {
            __DEV__ && invariant.warn(58);
        }
        if (paramsOrClient instanceof SubscriptionClient) {
            this.subscriptionClient = paramsOrClient;
        }
        else {
            this.subscriptionClient = new SubscriptionClient(paramsOrClient.uri, paramsOrClient.options, paramsOrClient.webSocketImpl);
        }
    }
    request(operation) {
        return new Observable((observer) => {
            const subscription = this.subscriptionClient
                .request(operation)
                .subscribe(observer);
            return () => {
                subscription.unsubscribe();
            };
        });
    }
}
//# sourceMappingURL=index.js.map
