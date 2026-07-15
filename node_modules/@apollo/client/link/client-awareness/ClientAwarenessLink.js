import { ApolloLink } from "@apollo/client/link";
import { compact } from "@apollo/client/utilities/internal";
/**
 * `ClientAwarenessLink` provides support for providing client awareness
 * features.
 *
 * @remarks
 *
 * Client awareness adds identifying information about the client to HTTP
 * requests for use with metrics reporting tools, such as [Apollo GraphOS](https://apollographql.com/docs/graphos/platform).
 * It is included in the functionality of [`HttpLink`](https://apollographql.com/docs/react/api/link/apollo-link-http) by default.
 *
 * Client awareness distinguishes between user-provided client awareness
 * (provided by the `clientAwareness` option) and enhanced client awareness
 * (provided by the `enhancedClientAwareness` option). User-provided client
 * awareness enables you to set a customized client name and version for
 * identification in metrics reporting tools. Enhanced client awareness enables
 * the identification of the Apollo Client package name and version.
 *
 * @example
 *
 * ```ts
 * import { ClientAwarenessLink } from "@apollo/client/link/client-awareness";
 *
 * const link = new ClientAwarenessLink({
 *   clientAwareness: {
 *     name: "My Client",
 *     version: "1",
 *   },
 *   enhancedClientAwareness: {
 *     transport: "extensions",
 *   },
 * });
 * ```
 */
export class ClientAwarenessLink extends ApolloLink {
    constructor(options = {}) {
        super((operation, forward) => {
            const client = operation.client;
            const clientOptions = client["queryManager"].clientOptions;
            const context = operation.getContext();
            {
                const { name, version, transport = "headers", } = compact({}, clientOptions.clientAwareness, options.clientAwareness, context.clientAwareness);
                if (transport === "headers") {
                    operation.setContext(({ headers }) => {
                        return {
                            headers: compact(
                            // setting these first so that they can be overridden by user-provided headers
                            {
                                "apollographql-client-name": name,
                                "apollographql-client-version": version,
                            }, headers),
                        };
                    });
                }
            }
            {
                const { transport = "extensions" } = compact({}, clientOptions.enhancedClientAwareness, options.enhancedClientAwareness);
                if (transport === "extensions") {
                    operation.extensions = compact(
                    // setting these first so that it can be overridden by user-provided extensions
                    {
                        clientLibrary: {
                            name: "@apollo/client",
                            version: client.version,
                        },
                    }, operation.extensions);
                }
                if (transport === "headers") {
                    operation.setContext(({ headers }) => {
                        return {
                            headers: compact(
                            // setting these first so that they can be overridden by user-provided headers
                            {
                                "apollographql-library-name": "@apollo/client",
                                "apollographql-library-version": client.version,
                            }, headers),
                        };
                    });
                }
            }
            return forward(operation);
        });
    }
}
//# sourceMappingURL=ClientAwarenessLink.js.map