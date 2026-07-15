/* Core */
export { ApolloClient } from "./ApolloClient.js";
export { ObservableQuery } from "./ObservableQuery.js";
export { RefetchEventManager } from "./RefetchEventManager.js";
export { onlineSource } from "./refetchSources/onlineSource.js";
export { windowFocusSource } from "./refetchSources/windowFocusSource.js";
export { NetworkStatus } from "./networkStatus.js";
export { CombinedGraphQLErrors, CombinedProtocolErrors, LinkError, LocalStateError, ServerError, ServerParseError, UnconventionalError, } from "@apollo/client/errors";
export { ApolloCache, defaultDataIdFromObject, InMemoryCache, makeVar, MissingFieldError, } from "@apollo/client/cache";
/* Link */
export { ApolloLink, concat, empty, execute, from, split, } from "@apollo/client/link";
export { checkFetcher, createHttpLink, createSignalIfSupported, defaultPrinter, fallbackHttpConfig, HttpLink, parseAndCheckHttpResponse, rewriteURIForGET, selectHttpOptionsAndBody, 
// TODO remove: needed by @apollo/client/link/batch-http but not public
selectHttpOptionsAndBodyInternal, selectURI, } from "@apollo/client/link/http";
export { DocumentTransform, 
/** @deprecated Please import `isNetworkRequestSettled` from `@apollo/client/utilities`. */
isNetworkRequestSettled, isReference, Observable, } from "@apollo/client/utilities";
/* Supporting */
// The verbosity of invariant.{log,warn,error} can be controlled globally
// by passing "log", "warn", "error", or "silent" to setVerbosity ("log" is the default).
// Note that all invariant.* logging is hidden in production.
export { setVerbosity as setLogVerbosity } from "@apollo/client/utilities/invariant";
// Note that importing `gql` by itself, then destructuring
// additional properties separately before exporting, is intentional.
// Due to the way the `graphql-tag` library is setup, certain bundlers
// can't find the properties added to the exported `gql` function without
// additional guidance (e.g. Rollup - see
// https://rollupjs.org/guide/en/#error-name-is-not-exported-by-module).
// Instead of having people that are using bundlers with `@apollo/client` add
// extra bundler config to help `graphql-tag` exports be found (which would be
// awkward since they aren't importing `graphql-tag` themselves), this
// workaround of pulling the extra properties off the `gql` function,
// then re-exporting them separately, helps keeps bundlers happy without any
// additional config changes.
export { disableExperimentalFragmentVariables, disableFragmentWarnings, enableExperimentalFragmentVariables, gql, resetCaches, } from "graphql-tag";
export { build, version } from "../version.js";
//# sourceMappingURL=index.js.map