import { ApolloLink } from "@apollo/client/link";
import { ClientAwarenessLink } from "@apollo/client/link/client-awareness";
import { BaseHttpLink } from "./BaseHttpLink.js";
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
export class HttpLink extends ApolloLink {
    constructor(options = {}) {
        const { left, right, request } = ApolloLink.from([
            new ClientAwarenessLink(options),
            new BaseHttpLink(options),
        ]);
        super(request);
        Object.assign(this, { left, right });
    }
}
/**
 * @deprecated
 * Use `HttpLink` from `@apollo/client/link/http` instead.
 */
export const createHttpLink = (options = {}) => new HttpLink(options);
//# sourceMappingURL=HttpLink.js.map