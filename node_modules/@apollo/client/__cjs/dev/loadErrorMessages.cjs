"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadErrorMessages = loadErrorMessages;
const invariantErrorCodes_js_1 = require("../invariantErrorCodes.cjs");
const loadErrorMessageHandler_js_1 = require("./loadErrorMessageHandler.cjs");
function loadErrorMessages() {
    (0, loadErrorMessageHandler_js_1.loadErrorMessageHandler)(invariantErrorCodes_js_1.errorCodes);
}
//# sourceMappingURL=loadErrorMessages.cjs.map
