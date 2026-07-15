"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useApolloClient = useApolloClient;
const tslib_1 = require("tslib");
const React = tslib_1.__importStar(require("react"));
const invariant_1 = require("@apollo/client/utilities/invariant");
const ApolloContext_js_1 = require("../context/ApolloContext.cjs");
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
function useApolloClient(override) {
    const context = React.useContext((0, ApolloContext_js_1.getApolloContext)());
    const client = override || context.client;
    (0, invariant_1.invariant)(!!client, 28);
    return client;
}
//# sourceMappingURL=useApolloClient.cjs.map
