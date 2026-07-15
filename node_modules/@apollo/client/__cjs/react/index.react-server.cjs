"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useSuspenseQuery = exports.useSuspenseFragment = exports.useSubscription = exports.useReadQuery = exports.useReactiveVar = exports.useQueryRefHandlers = exports.useQuery = exports.useMutation = exports.useLoadableQuery = exports.useLazyQuery = exports.useFragment = exports.useBackgroundQuery = exports.useApolloClient = exports.createQueryPreloader = exports.getApolloContext = exports.ApolloProvider = void 0;
function missingFeatureWarning(feature, name) {
    return {
        [name]() {
            throw new Error(`The ${feature} ${name} is not supported in React Server Components, but only in Client Components.`);
        },
    }[name];
}
// prettier-ignore
exports.ApolloProvider = missingFeatureWarning("component", "ApolloProvider");
// prettier-ignore
exports.getApolloContext = missingFeatureWarning("function", "getApolloContext");
// prettier-ignore
exports.createQueryPreloader = missingFeatureWarning("function", "createQueryPreloader");
// prettier-ignore
exports.useApolloClient = missingFeatureWarning("hook", "useApolloClient");
// prettier-ignore
exports.useBackgroundQuery = missingFeatureWarning("hook", "useBackgroundQuery");
// prettier-ignore
exports.useFragment = missingFeatureWarning("hook", "useFragment");
// prettier-ignore
exports.useLazyQuery = missingFeatureWarning("hook", "useLazyQuery");
// prettier-ignore
exports.useLoadableQuery = missingFeatureWarning("hook", "useLoadableQuery");
// prettier-ignore
exports.useMutation = missingFeatureWarning("hook", "useMutation");
// prettier-ignore
exports.useQuery = missingFeatureWarning("hook", "useQuery");
// prettier-ignore
exports.useQueryRefHandlers = missingFeatureWarning("hook", "useQueryRefHandlers");
// prettier-ignore
exports.useReactiveVar = missingFeatureWarning("hook", "useReactiveVar");
// prettier-ignore
exports.useReadQuery = missingFeatureWarning("hook", "useReadQuery");
// prettier-ignore
exports.useSubscription = missingFeatureWarning("hook", "useSubscription");
// prettier-ignore
exports.useSuspenseFragment = missingFeatureWarning("hook", "useSuspenseFragment");
// prettier-ignore
exports.useSuspenseQuery = missingFeatureWarning("hook", "useSuspenseQuery");
// We cannot warn on import of `skipToken`, and there is nothing to "execute" giving us a moment to warn,
// so we can only fully omit it from the bundle, leading to a bundling time error.
// export const skipToken = {};
//# sourceMappingURL=index.react-server.cjs.map
