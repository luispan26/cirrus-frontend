import { global } from "@apollo/client/utilities/internal/globals";
import { setErrorMessageHandler } from "./setErrorMessageHandler.js";
import { ApolloErrorMessageHandler } from "./symbol.js";
/**
 * Injects Apollo Client's default error message handler into the application and
 * also loads the error codes that are passed in as arguments.
 */
export function loadErrorMessageHandler(...errorCodes) {
    setErrorMessageHandler(handler);
    for (const codes of errorCodes) {
        Object.assign(handler, codes);
    }
    return handler;
}
const handler = ((message, args) => {
    if (typeof message === "number") {
        const definition = global[ApolloErrorMessageHandler][message];
        if (!message || !definition?.message)
            return;
        message = definition.message;
    }
    return args.reduce((msg, arg) => msg.replace(/%[sdfo]/, String(arg)), String(message));
});
//# sourceMappingURL=loadErrorMessageHandler.js.map