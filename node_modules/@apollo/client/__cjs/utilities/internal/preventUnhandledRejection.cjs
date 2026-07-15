"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.preventUnhandledRejection = preventUnhandledRejection;
function preventUnhandledRejection(promise) {
    promise.catch(() => { });
    return promise;
}
//# sourceMappingURL=preventUnhandledRejection.cjs.map
