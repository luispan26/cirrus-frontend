"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadDevMessages = loadDevMessages;
const invariantErrorCodes_js_1 = require("../invariantErrorCodes.cjs");
const loadErrorMessageHandler_js_1 = require("./loadErrorMessageHandler.cjs");
function loadDevMessages() {
    (0, loadErrorMessageHandler_js_1.loadErrorMessageHandler)(invariantErrorCodes_js_1.devDebug, invariantErrorCodes_js_1.devError, invariantErrorCodes_js_1.devLog, invariantErrorCodes_js_1.devWarn);
}
//# sourceMappingURL=loadDevMessages.cjs.map
