"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getApolloContext = getApolloContext;
const tslib_1 = require("tslib");
const React = tslib_1.__importStar(require("react"));
const invariant_1 = require("@apollo/client/utilities/invariant");
// To make sure Apollo Client doesn't create more than one React context
// (which can lead to problems like having an Apollo Client instance added
// in one context, then attempting to retrieve it from another different
// context), a single Apollo context is created and tracked in global state.
const contextKey = Symbol.for("__APOLLO_CONTEXT__");
function getApolloContext() {
    (0, invariant_1.invariant)("createContext" in React, 37);
    let context = React.createContext[contextKey];
    if (!context) {
        Object.defineProperty(React.createContext, contextKey, {
            value: (context = React.createContext({})),
            enumerable: false,
            writable: false,
            configurable: true,
        });
        context.displayName = "ApolloContext";
    }
    return context;
}
//# sourceMappingURL=ApolloContext.cjs.map
