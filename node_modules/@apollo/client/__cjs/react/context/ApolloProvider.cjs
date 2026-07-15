"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApolloProvider = void 0;
const tslib_1 = require("tslib");
const React = tslib_1.__importStar(require("react"));
const invariant_1 = require("@apollo/client/utilities/invariant");
const ApolloContext_js_1 = require("./ApolloContext.cjs");
const ApolloProvider = ({ client, children, }) => {
    const ApolloContext = (0, ApolloContext_js_1.getApolloContext)();
    const parentContext = React.useContext(ApolloContext);
    const context = React.useMemo(() => {
        return {
            ...parentContext,
            client: client || parentContext.client,
        };
    }, [parentContext, client]);
    (0, invariant_1.invariant)(context.client, 38);
    return (React.createElement(ApolloContext.Provider, { value: context }, children));
};
exports.ApolloProvider = ApolloProvider;
//# sourceMappingURL=ApolloProvider.cjs.map
