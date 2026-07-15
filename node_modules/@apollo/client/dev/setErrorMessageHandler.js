import { global } from "@apollo/client/utilities/internal/globals";
import { ApolloErrorMessageHandler } from "./symbol.js";
/**
 * Overrides the global "Error Message Handler" with a custom implementation.
 */
export function setErrorMessageHandler(handler) {
    global[ApolloErrorMessageHandler] = handler;
}
//# sourceMappingURL=setErrorMessageHandler.js.map