"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectURI = void 0;
const selectURI = (operation, fallbackURI) => {
    const context = operation.getContext();
    const contextURI = context.uri;
    if (contextURI) {
        return contextURI;
    }
    else if (typeof fallbackURI === "function") {
        return fallbackURI(operation);
    }
    else {
        return fallbackURI || "/graphql";
    }
};
exports.selectURI = selectURI;
//# sourceMappingURL=selectURI.cjs.map
