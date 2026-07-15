"use strict";
/* Core */
Object.defineProperty(exports, "__esModule", { value: true });
exports.version = exports.build = exports.resetCaches = exports.gql = exports.enableExperimentalFragmentVariables = exports.disableFragmentWarnings = exports.disableExperimentalFragmentVariables = exports.setLogVerbosity = exports.Observable = exports.isReference = exports.isNetworkRequestSettled = exports.DocumentTransform = exports.selectURI = exports.selectHttpOptionsAndBodyInternal = exports.selectHttpOptionsAndBody = exports.rewriteURIForGET = exports.parseAndCheckHttpResponse = exports.HttpLink = exports.fallbackHttpConfig = exports.defaultPrinter = exports.createSignalIfSupported = exports.createHttpLink = exports.checkFetcher = exports.split = exports.from = exports.execute = exports.empty = exports.concat = exports.ApolloLink = exports.MissingFieldError = exports.makeVar = exports.InMemoryCache = exports.defaultDataIdFromObject = exports.ApolloCache = exports.UnconventionalError = exports.ServerParseError = exports.ServerError = exports.LocalStateError = exports.LinkError = exports.CombinedProtocolErrors = exports.CombinedGraphQLErrors = exports.NetworkStatus = exports.windowFocusSource = exports.onlineSource = exports.RefetchEventManager = exports.ObservableQuery = exports.ApolloClient = void 0;
var ApolloClient_js_1 = require("./ApolloClient.cjs");
Object.defineProperty(exports, "ApolloClient", { enumerable: true, get: function () { return ApolloClient_js_1.ApolloClient; } });
var ObservableQuery_js_1 = require("./ObservableQuery.cjs");
Object.defineProperty(exports, "ObservableQuery", { enumerable: true, get: function () { return ObservableQuery_js_1.ObservableQuery; } });
var RefetchEventManager_js_1 = require("./RefetchEventManager.cjs");
Object.defineProperty(exports, "RefetchEventManager", { enumerable: true, get: function () { return RefetchEventManager_js_1.RefetchEventManager; } });
var onlineSource_js_1 = require("./refetchSources/onlineSource.cjs");
Object.defineProperty(exports, "onlineSource", { enumerable: true, get: function () { return onlineSource_js_1.onlineSource; } });
var windowFocusSource_js_1 = require("./refetchSources/windowFocusSource.cjs");
Object.defineProperty(exports, "windowFocusSource", { enumerable: true, get: function () { return windowFocusSource_js_1.windowFocusSource; } });
var networkStatus_js_1 = require("./networkStatus.cjs");
Object.defineProperty(exports, "NetworkStatus", { enumerable: true, get: function () { return networkStatus_js_1.NetworkStatus; } });
var errors_1 = require("@apollo/client/errors");
Object.defineProperty(exports, "CombinedGraphQLErrors", { enumerable: true, get: function () { return errors_1.CombinedGraphQLErrors; } });
Object.defineProperty(exports, "CombinedProtocolErrors", { enumerable: true, get: function () { return errors_1.CombinedProtocolErrors; } });
Object.defineProperty(exports, "LinkError", { enumerable: true, get: function () { return errors_1.LinkError; } });
Object.defineProperty(exports, "LocalStateError", { enumerable: true, get: function () { return errors_1.LocalStateError; } });
Object.defineProperty(exports, "ServerError", { enumerable: true, get: function () { return errors_1.ServerError; } });
Object.defineProperty(exports, "ServerParseError", { enumerable: true, get: function () { return errors_1.ServerParseError; } });
Object.defineProperty(exports, "UnconventionalError", { enumerable: true, get: function () { return errors_1.UnconventionalError; } });
var cache_1 = require("@apollo/client/cache");
Object.defineProperty(exports, "ApolloCache", { enumerable: true, get: function () { return cache_1.ApolloCache; } });
Object.defineProperty(exports, "defaultDataIdFromObject", { enumerable: true, get: function () { return cache_1.defaultDataIdFromObject; } });
Object.defineProperty(exports, "InMemoryCache", { enumerable: true, get: function () { return cache_1.InMemoryCache; } });
Object.defineProperty(exports, "makeVar", { enumerable: true, get: function () { return cache_1.makeVar; } });
Object.defineProperty(exports, "MissingFieldError", { enumerable: true, get: function () { return cache_1.MissingFieldError; } });
/* Link */
var link_1 = require("@apollo/client/link");
Object.defineProperty(exports, "ApolloLink", { enumerable: true, get: function () { return link_1.ApolloLink; } });
Object.defineProperty(exports, "concat", { enumerable: true, get: function () { return link_1.concat; } });
Object.defineProperty(exports, "empty", { enumerable: true, get: function () { return link_1.empty; } });
Object.defineProperty(exports, "execute", { enumerable: true, get: function () { return link_1.execute; } });
Object.defineProperty(exports, "from", { enumerable: true, get: function () { return link_1.from; } });
Object.defineProperty(exports, "split", { enumerable: true, get: function () { return link_1.split; } });
var http_1 = require("@apollo/client/link/http");
Object.defineProperty(exports, "checkFetcher", { enumerable: true, get: function () { return http_1.checkFetcher; } });
Object.defineProperty(exports, "createHttpLink", { enumerable: true, get: function () { return http_1.createHttpLink; } });
Object.defineProperty(exports, "createSignalIfSupported", { enumerable: true, get: function () { return http_1.createSignalIfSupported; } });
Object.defineProperty(exports, "defaultPrinter", { enumerable: true, get: function () { return http_1.defaultPrinter; } });
Object.defineProperty(exports, "fallbackHttpConfig", { enumerable: true, get: function () { return http_1.fallbackHttpConfig; } });
Object.defineProperty(exports, "HttpLink", { enumerable: true, get: function () { return http_1.HttpLink; } });
Object.defineProperty(exports, "parseAndCheckHttpResponse", { enumerable: true, get: function () { return http_1.parseAndCheckHttpResponse; } });
Object.defineProperty(exports, "rewriteURIForGET", { enumerable: true, get: function () { return http_1.rewriteURIForGET; } });
Object.defineProperty(exports, "selectHttpOptionsAndBody", { enumerable: true, get: function () { return http_1.selectHttpOptionsAndBody; } });
// TODO remove: needed by @apollo/client/link/batch-http but not public
Object.defineProperty(exports, "selectHttpOptionsAndBodyInternal", { enumerable: true, get: function () { return http_1.selectHttpOptionsAndBodyInternal; } });
Object.defineProperty(exports, "selectURI", { enumerable: true, get: function () { return http_1.selectURI; } });
var utilities_1 = require("@apollo/client/utilities");
Object.defineProperty(exports, "DocumentTransform", { enumerable: true, get: function () { return utilities_1.DocumentTransform; } });
/** @deprecated Please import `isNetworkRequestSettled` from `@apollo/client/utilities`. */
Object.defineProperty(exports, "isNetworkRequestSettled", { enumerable: true, get: function () { return utilities_1.isNetworkRequestSettled; } });
Object.defineProperty(exports, "isReference", { enumerable: true, get: function () { return utilities_1.isReference; } });
Object.defineProperty(exports, "Observable", { enumerable: true, get: function () { return utilities_1.Observable; } });
/* Supporting */
// The verbosity of invariant.{log,warn,error} can be controlled globally
// by passing "log", "warn", "error", or "silent" to setVerbosity ("log" is the default).
// Note that all invariant.* logging is hidden in production.
var invariant_1 = require("@apollo/client/utilities/invariant");
Object.defineProperty(exports, "setLogVerbosity", { enumerable: true, get: function () { return invariant_1.setVerbosity; } });
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
var graphql_tag_1 = require("graphql-tag");
Object.defineProperty(exports, "disableExperimentalFragmentVariables", { enumerable: true, get: function () { return graphql_tag_1.disableExperimentalFragmentVariables; } });
Object.defineProperty(exports, "disableFragmentWarnings", { enumerable: true, get: function () { return graphql_tag_1.disableFragmentWarnings; } });
Object.defineProperty(exports, "enableExperimentalFragmentVariables", { enumerable: true, get: function () { return graphql_tag_1.enableExperimentalFragmentVariables; } });
Object.defineProperty(exports, "gql", { enumerable: true, get: function () { return graphql_tag_1.gql; } });
Object.defineProperty(exports, "resetCaches", { enumerable: true, get: function () { return graphql_tag_1.resetCaches; } });
var version_js_1 = require("../version.cjs");
Object.defineProperty(exports, "build", { enumerable: true, get: function () { return version_js_1.build; } });
Object.defineProperty(exports, "version", { enumerable: true, get: function () { return version_js_1.version; } });
//# sourceMappingURL=index.cjs.map
