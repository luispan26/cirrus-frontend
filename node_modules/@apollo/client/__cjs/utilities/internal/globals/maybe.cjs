"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.maybe = maybe;
function maybe(thunk) {
    try {
        return thunk();
    }
    catch { }
}
//# sourceMappingURL=maybe.cjs.map
