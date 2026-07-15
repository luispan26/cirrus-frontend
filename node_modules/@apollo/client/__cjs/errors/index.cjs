"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnconventionalError = exports.ServerParseError = exports.ServerError = exports.LocalStateError = exports.registerLinkError = exports.LinkError = exports.isErrorLike = exports.CombinedProtocolErrors = exports.CombinedGraphQLErrors = exports.PROTOCOL_ERRORS_SYMBOL = void 0;
exports.graphQLResultHasProtocolErrors = graphQLResultHasProtocolErrors;
exports.toErrorLike = toErrorLike;
const CombinedProtocolErrors_js_1 = require("./CombinedProtocolErrors.cjs");
const isErrorLike_js_1 = require("./isErrorLike.cjs");
const UnconventionalError_js_1 = require("./UnconventionalError.cjs");
// This Symbol allows us to pass transport-specific errors from the link chain
// into QueryManager/client internals without risking a naming collision within
// extensions (which implementers can use as they see fit).
exports.PROTOCOL_ERRORS_SYMBOL = Symbol();
function graphQLResultHasProtocolErrors(result) {
    if ("extensions" in result) {
        return CombinedProtocolErrors_js_1.CombinedProtocolErrors.is(result.extensions[exports.PROTOCOL_ERRORS_SYMBOL]);
    }
    return false;
}
function toErrorLike(error) {
    if ((0, isErrorLike_js_1.isErrorLike)(error)) {
        return error;
    }
    if (typeof error === "string") {
        return new Error(error, { cause: error });
    }
    return new UnconventionalError_js_1.UnconventionalError(error);
}
var CombinedGraphQLErrors_js_1 = require("./CombinedGraphQLErrors.cjs");
Object.defineProperty(exports, "CombinedGraphQLErrors", { enumerable: true, get: function () { return CombinedGraphQLErrors_js_1.CombinedGraphQLErrors; } });
var CombinedProtocolErrors_js_2 = require("./CombinedProtocolErrors.cjs");
Object.defineProperty(exports, "CombinedProtocolErrors", { enumerable: true, get: function () { return CombinedProtocolErrors_js_2.CombinedProtocolErrors; } });
var isErrorLike_js_2 = require("./isErrorLike.cjs");
Object.defineProperty(exports, "isErrorLike", { enumerable: true, get: function () { return isErrorLike_js_2.isErrorLike; } });
var LinkError_js_1 = require("./LinkError.cjs");
Object.defineProperty(exports, "LinkError", { enumerable: true, get: function () { return LinkError_js_1.LinkError; } });
Object.defineProperty(exports, "registerLinkError", { enumerable: true, get: function () { return LinkError_js_1.registerLinkError; } });
var LocalStateError_js_1 = require("./LocalStateError.cjs");
Object.defineProperty(exports, "LocalStateError", { enumerable: true, get: function () { return LocalStateError_js_1.LocalStateError; } });
var ServerError_js_1 = require("./ServerError.cjs");
Object.defineProperty(exports, "ServerError", { enumerable: true, get: function () { return ServerError_js_1.ServerError; } });
var ServerParseError_js_1 = require("./ServerParseError.cjs");
Object.defineProperty(exports, "ServerParseError", { enumerable: true, get: function () { return ServerParseError_js_1.ServerParseError; } });
var UnconventionalError_js_2 = require("./UnconventionalError.cjs");
Object.defineProperty(exports, "UnconventionalError", { enumerable: true, get: function () { return UnconventionalError_js_2.UnconventionalError; } });
//# sourceMappingURL=index.cjs.map
