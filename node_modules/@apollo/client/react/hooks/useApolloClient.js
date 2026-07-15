import * as React from "react";
import { invariant } from "@apollo/client/utilities/invariant";
import { getApolloContext } from "../context/ApolloContext.js";
/**
 * @example
 *
 * ```jsx
 * import { useApolloClient } from "@apollo/client/react";
 *
 * function SomeComponent() {
 *   const client = useApolloClient();
 *   // `client` is now set to the `ApolloClient` instance being used by the
 *   // application (that was configured using something like `ApolloProvider`)
 * }
 * ```
 *
 * @returns The `ApolloClient` instance being used by the application.
 */
export function useApolloClient(override) {
    const context = React.useContext(getApolloContext());
    const client = override || context.client;
    invariant(!!client, 28);
    return client;
}
//# sourceMappingURL=useApolloClient.js.map
