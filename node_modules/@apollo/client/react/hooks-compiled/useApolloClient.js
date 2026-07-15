import { c as _c } from "@apollo/client/react/internal/compiler-runtime";
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
 const $ = _c(1);
 let t0;

 if ($[0] === Symbol.for("react.memo_cache_sentinel")) {
  t0 = getApolloContext();
  $[0] = t0;
 } else {
  t0 = $[0];
 }

 const context = React.useContext(t0);
 const client = override || context.client;
 invariant(!!client, 28);
 return client;
}
//# sourceMappingURL=useApolloClient.js.map
