import type { Client } from "graphql-ws";
import { Observable } from "rxjs";
import { ApolloLink } from "@apollo/client/link";
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
export declare class GraphQLWsLink extends ApolloLink {
    readonly client: Client;
    constructor(client: Client);
    request(operation: ApolloLink.Operation): Observable<ApolloLink.Result>;
}
//# sourceMappingURL=index.d.ts.map