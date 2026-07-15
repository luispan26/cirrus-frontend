"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotImplementedHandler = void 0;
const internal_1 = require("@apollo/client/utilities/internal");
const invariant_1 = require("@apollo/client/utilities/invariant");
class NotImplementedHandler {
    isIncrementalResult(_) {
        return false;
    }
    prepareRequest(request) {
        (0, invariant_1.invariant)(!(0, internal_1.hasDirectives)(["defer", "stream"], request.query), 67);
        return request;
    }
    extractErrors() { }
    // This code path can never be reached, so we won't implement it.
    startRequest = undefined;
}
exports.NotImplementedHandler = NotImplementedHandler;
//# sourceMappingURL=notImplemented.cjs.map
