export const selectURI = (operation, fallbackURI) => {
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
//# sourceMappingURL=selectURI.js.map