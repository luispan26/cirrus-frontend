"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadErrorMessageHandler = loadErrorMessageHandler;
const globals_1 = require("@apollo/client/utilities/internal/globals");
const setErrorMessageHandler_js_1 = require("./setErrorMessageHandler.cjs");
const symbol_js_1 = require("./symbol.cjs");
/**
 * Injects Apollo Client's default error message handler into the application and
 * also loads the error codes that are passed in as arguments.
 */
function loadErrorMessageHandler(...errorCodes) {
    (0, setErrorMessageHandler_js_1.setErrorMessageHandler)(handler);
    for (const codes of errorCodes) {
        Object.assign(handler, codes);
    }
    return handler;
}
const handler = ((message, args) => {
    if (typeof message === "number") {
        const definition = globals_1.global[symbol_js_1.ApolloErrorMessageHandler][message];
        if (!message || !definition?.message)
            return;
        message = definition.message;
    }
    return args.reduce((msg, arg) => msg.replace(/%[sdfo]/, String(arg)), String(message));
});
//# sourceMappingURL=loadErrorMessageHandler.cjs.map
