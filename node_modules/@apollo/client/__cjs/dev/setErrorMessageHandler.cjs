"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setErrorMessageHandler = setErrorMessageHandler;
const globals_1 = require("@apollo/client/utilities/internal/globals");
const symbol_js_1 = require("./symbol.cjs");
/**
 * Overrides the global "Error Message Handler" with a custom implementation.
 */
function setErrorMessageHandler(handler) {
    globals_1.global[symbol_js_1.ApolloErrorMessageHandler] = handler;
}
//# sourceMappingURL=setErrorMessageHandler.cjs.map
