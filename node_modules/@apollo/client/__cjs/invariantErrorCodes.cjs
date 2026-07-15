// This file is used by the error message display website and the
// @apollo/client/includeErrors entry point.
// This file is not meant to be imported manually.
Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.devError = exports.devWarn = exports.devLog = exports.devDebug = exports.errorCodes = void 0;

exports.errorCodes = {
  1: {
    file: "@apollo/client/__cjs/utilities/internal/checkDocument.cjs",
    condition: "doc && doc.kind === \"Document\"",

    message: `Expecting a parsed GraphQL document. Perhaps you need to wrap the query \
string in a "gql" tag? http://docs.apollostack.com/apollo-client/core.html#gql`
  },

  2: {
    file: "@apollo/client/__cjs/utilities/internal/checkDocument.cjs",
    message: `Schema type definitions not allowed in queries. Found: "%s"`
  },

  3: {
    file: "@apollo/client/__cjs/utilities/internal/checkDocument.cjs",
    condition: "operations.length <= 1",
    message: `Ambiguous GraphQL document: contains %s operations`
  },

  4: {
    file: "@apollo/client/__cjs/utilities/internal/checkDocument.cjs",
    condition: "operations.length == 1 && operations[0].operation === expectedType",
    message: `Running a %s requires a graphql ` + `%s, but a %s was used instead.`
  },

  5: {
    file: "@apollo/client/__cjs/utilities/internal/checkDocument.cjs",
    message: '`%s` is a forbidden field alias name in the selection set for field `%s` in %s "%s".'
  },

  6: {
    file: "@apollo/client/__cjs/utilities/internal/getFragmentDefinition.cjs",
    condition: "doc.kind === \"Document\"",

    message: `Expecting a parsed GraphQL document. Perhaps you need to wrap the query \
string in a "gql" tag? http://docs.apollostack.com/apollo-client/core.html#gql`
  },

  7: {
    file: "@apollo/client/__cjs/utilities/internal/getFragmentDefinition.cjs",
    condition: "doc.definitions.length <= 1",
    message: "Fragment must have exactly one definition."
  },

  8: {
    file: "@apollo/client/__cjs/utilities/internal/getFragmentDefinition.cjs",
    condition: "fragmentDef.kind === \"FragmentDefinition\"",
    message: "Must be a fragment definition."
  },

  9: {
    file: "@apollo/client/__cjs/utilities/internal/getFragmentFromSelection.cjs",
    condition: "fragment",
    message: `No fragment named %s`
  },

  10: {
    file: "@apollo/client/__cjs/utilities/internal/getFragmentQueryDocument.cjs",

    message: `Found a %s operation%s. ` +
        "No operations are allowed when using a fragment as a query. Only fragments are allowed."
  },

  11: {
    file: "@apollo/client/__cjs/utilities/internal/getFragmentQueryDocument.cjs",
    condition: "fragments.length === 1",
    message: `Found %s fragments. \`fragmentName\` must be provided when there is not exactly 1 fragment.`
  },

  12: {
    file: "@apollo/client/__cjs/utilities/internal/getMainDefinition.cjs",
    message: "Expected a parsed GraphQL query with a query, mutation, subscription, or a fragment."
  },

  13: {
    file: "@apollo/client/__cjs/utilities/internal/getQueryDefinition.cjs",
    condition: "queryDef && queryDef.operation === \"query\"",
    message: "Must contain a query definition."
  },

  15: {
    file: "@apollo/client/__cjs/utilities/internal/shouldInclude.cjs",
    condition: "evaledValue !== void 0",
    message: `Invalid variable referenced in @%s directive.`
  },

  16: {
    file: "@apollo/client/__cjs/utilities/internal/shouldInclude.cjs",
    condition: "directiveArguments && directiveArguments.length === 1",
    message: `Incorrect number of arguments for the @%s directive.`
  },

  17: {
    file: "@apollo/client/__cjs/utilities/internal/shouldInclude.cjs",
    condition: "ifArgument.name && ifArgument.name.value === \"if\"",
    message: `Invalid argument for the @%s directive.`
  },

  18: {
    file: "@apollo/client/__cjs/utilities/internal/shouldInclude.cjs",
    condition: "ifValue &&\n    (ifValue.kind === \"Variable\" || ifValue.kind === \"BooleanValue\")",
    message: `Argument for the @%s directive must be a variable or a boolean value.`
  },

  19: {
    file: "@apollo/client/__cjs/utilities/internal/valueToObjectRepresentation.cjs",

    message: `The inline argument "%s" of kind "%s"` +
        "is not supported. Use variables instead of inline arguments to " +
        "overcome this limitation."
  },

  20: {
    file: "@apollo/client/__cjs/utilities/graphql/DocumentTransform.cjs",
    condition: "Array.isArray(cacheKeys)",
    message: "`getCacheKey` must return an array or undefined"
  },

  21: {
    file: "@apollo/client/__cjs/testing/core/mocking/mockLink.cjs",
    condition: "max > min",
    message: "realisticDelay: `min` must be less than `max`"
  },

  22: {
    file: "@apollo/client/__cjs/testing/core/mocking/mockLink.cjs",
    condition: "queryWithoutClientOnlyDirectives",
    message: "query is required"
  },

  23: {
    file: "@apollo/client/__cjs/testing/core/mocking/mockLink.cjs",
    condition: "serverQuery",
    message: "Cannot mock a client-only query. Mocked responses should contain at least one non-client field."
  },

  24: {
    file: "@apollo/client/__cjs/testing/core/mocking/mockLink.cjs",
    condition: "(mock.maxUsageCount ?? 1) > 0",
    message: "Mocked response `maxUsageCount` must be greater than 0. Given %s"
  },

  25: {
    file: "@apollo/client/__cjs/react/ssr/prerenderStatic.cjs",
    condition: "renderCount <= maxRerenders",

    message: `Exceeded maximum rerender count of %d.
This either means you have very deep \`useQuery\` waterfalls in your application
and need to increase the \`maxRerender\` option to \`prerenderStatic\`, or that
you have an infinite render loop in your application.`
  },

  26: {
    file: "@apollo/client/__cjs/react/ssr/prerenderStatic.cjs",
    condition: "!signal?.aborted",
    message: "The operation was aborted before it could be attempted."
  },

  27: {
    file: "@apollo/client/__cjs/react/internal/cache/QueryReference.cjs",
    condition: "!queryRef || QUERY_REFERENCE_SYMBOL in queryRef",
    message: "Expected a QueryRef object, but got something else instead."
  },

  28: {
    file: "@apollo/client/__cjs/react/hooks/useApolloClient.cjs",
    condition: "!!client",

    message: 'Could not find "client" in the context or passed in as an option. ' +
        "Wrap the root component in an <ApolloProvider>, or pass an ApolloClient " +
        "instance in via options."
  },

  29: {
    file: "@apollo/client/__cjs/react/hooks/useLazyQuery.cjs",
    condition: "resultRef.current",
    message: "useLazyQuery: '%s' cannot be called before executing the query."
  },

  30: {
    file: "@apollo/client/__cjs/react/hooks/useLazyQuery.cjs",
    condition: "!calledDuringRender()",
    message: "useLazyQuery: 'execute' should not be called during render. To start a query during render, use the 'useQuery' hook."
  },

  31: {
    file: "@apollo/client/__cjs/react/hooks/useLoadableQuery.cjs",
    condition: "!calledDuringRender()",
    message: "useLoadableQuery: 'loadQuery' should not be called during render. To start a query during render, use the 'useBackgroundQuery' hook."
  },

  32: {
    file: "@apollo/client/__cjs/react/hooks/useLoadableQuery.cjs",
    condition: "internalQueryRef",
    message: "The query has not been loaded. Please load the query."
  },

  33: {
    file: "@apollo/client/__cjs/react/hooks/useSubscription.cjs",
    condition: "!optionsRef.current.skip",
    message: "A subscription that is skipped cannot be restarted."
  },

  35: {
    file: "@apollo/client/__cjs/react/hooks/internal/validateSuspenseHookOptions.cjs",
    condition: "supportedFetchPolicies.includes(fetchPolicy)",
    message: `The fetch policy \`%s\` is not supported with suspense.`
  },

  37: {
    file: "@apollo/client/__cjs/react/context/ApolloContext.cjs",
    condition: "\"createContext\" in React",

    message: "Invoking `getApolloContext` in an environment where `React.createContext` is not available.\n" +
        "The Apollo Client functionality you are trying to use is only available in React Client Components.\n" +
        'Please make sure to add "use client" at the top of your file.\n' +
        // TODO: change to React documentation once React documentation contains information about Client Components
        "For more information, see https://nextjs.org/docs/getting-started/react-essentials#client-components"
  },

  38: {
    file: "@apollo/client/__cjs/react/context/ApolloProvider.cjs",
    condition: "context.client",

    message: "ApolloProvider was not passed a client instance. Make " +
        'sure you pass in your client via the "client" prop.'
  },

  39: {
    file: "@apollo/client/__cjs/masking/maskDefinition.cjs",
    condition: "fragment",
    message: "Could not find fragment with name '%s'."
  },

  41: {
    file: "@apollo/client/__cjs/masking/maskFragment.cjs",
    condition: "fragments.length === 1",
    message: `Found %s fragments. \`fragmentName\` must be provided when there is not exactly 1 fragment.`
  },

  42: {
    file: "@apollo/client/__cjs/masking/maskFragment.cjs",
    condition: "!!fragment",
    message: `Could not find fragment with name "%s".`
  },

  43: {
    file: "@apollo/client/__cjs/masking/maskOperation.cjs",
    condition: "definition",
    message: "Expected a parsed GraphQL document with a query, mutation, or subscription."
  },

  47: {
    file: "@apollo/client/__cjs/local-state/LocalState.cjs",
    condition: "(0, internal_1.hasDirectives)([\"client\"], document)",
    message: "Expected document to contain `@client` fields."
  },

  48: {
    file: "@apollo/client/__cjs/local-state/LocalState.cjs",
    condition: "(0, internal_1.hasDirectives)([\"client\"], document)",
    message: "Expected document to contain `@client` fields."
  },

  49: {
    file: "@apollo/client/__cjs/local-state/LocalState.cjs",
    condition: "fragment",
    message: "No fragment named %s"
  },

  55: {
    file: "@apollo/client/__cjs/local-state/LocalState.cjs",
    message: "Could not resolve __typename on object %o returned from resolver '%s'. '__typename' needs to be returned to properly resolve child fields."
  },

  56: {
    file: "@apollo/client/__cjs/local-state/LocalState.cjs",
    condition: "fragment",
    message: `No fragment named %s`
  },

  57: {
    file: "@apollo/client/__cjs/local-state/LocalState.cjs",
    condition: "cache.fragmentMatches",
    message: "The configured cache does not support fragment matching which will lead to incorrect results when executing local resolvers. Please use a cache that implements `fragmetMatches`."
  },

  59: {
    file: "@apollo/client/__cjs/link/persisted-queries/index.cjs",
    condition: "options &&\n    (typeof options.sha256 === \"function\" ||\n        typeof options.generateHash === \"function\")",

    message: 'Missing/invalid "sha256" or "generateHash" function. Please ' +
        'configure one using the "createPersistedQueryLink(options)" options ' +
        "parameter."
  },

  60: {
    file: "@apollo/client/__cjs/link/persisted-queries/index.cjs",
    condition: "forward",
    message: "PersistedQueryLink cannot be the last link in the chain."
  },

  61: {
    file: "@apollo/client/__cjs/link/http/checkFetcher.cjs",
    condition: "fetcher || typeof fetch !== \"undefined\"",

    message: `
"fetch" has not been found globally and no fetcher has been \
configured. To fix this, install a fetch package (like \
https://www.npmjs.com/package/cross-fetch), instantiate the \
fetcher, and pass it into your HttpLink constructor. For example:

import fetch from 'cross-fetch';
import { ApolloClient, HttpLink } from '@apollo/client';
const client = new ApolloClient({
  link: new HttpLink({ uri: '/graphql', fetch })
});
    `
  },

  62: {
    file: "@apollo/client/__cjs/link/http/parseAndCheckHttpResponse.cjs",
    condition: "response.body && typeof response.body.getReader === \"function\"",
    message: "Unknown type for `response.body`. Please use a `fetch` implementation that is WhatWG-compliant and that uses WhatWG ReadableStreams for `body`."
  },

  65: {
    file: "@apollo/client/__cjs/link/core/ApolloLink.cjs",
    message: "request is not implemented"
  },

  66: {
    file: "@apollo/client/__cjs/incremental/handlers/graphql17Alpha9.cjs",
    condition: "pending",
    message: "Could not find pending chunk for incremental value. Please file an issue for the Apollo Client team to investigate."
  },

  67: {
    file: "@apollo/client/__cjs/incremental/handlers/notImplemented.cjs",
    condition: "!(0, internal_1.hasDirectives)([\"defer\", \"stream\"], request.query)",
    message: "`@defer` and `@stream` are not supported without specifying an incremental handler. Please pass a handler as the `incrementalHandler` option to the `ApolloClient` constructor."
  },

  68: {
    file: "@apollo/client/__cjs/core/ApolloClient.cjs",
    condition: "options.cache",

    message: "To initialize Apollo Client, you must specify a 'cache' property " +
        "in the options object. \n" +
        "For more information, please visit: https://go.apollo.dev/c/docs"
  },

  69: {
    file: "@apollo/client/__cjs/core/ApolloClient.cjs",
    condition: "options.link",

    message: "To initialize Apollo Client, you must specify a 'link' property " +
        "in the options object. \n" +
        "For more information, please visit: https://go.apollo.dev/c/docs"
  },

  72: {
    file: "@apollo/client/__cjs/core/ApolloClient.cjs",
    condition: "options.fetchPolicy !== \"cache-and-network\"",

    message: "The cache-and-network fetchPolicy does not work with client.query, because " +
        "client.query can only return a single result. Please use client.watchQuery " +
        "to receive multiple results from the cache and the network, or consider " +
        "using a different fetchPolicy, such as cache-first or network-only."
  },

  73: {
    file: "@apollo/client/__cjs/core/ApolloClient.cjs",
    condition: "options.fetchPolicy !== \"standby\"",

    message: "The standby fetchPolicy does not work with client.query, because " +
        "standby does not fetch. Consider using a different fetchPolicy, such " +
        "as cache-first or network-only."
  },

  74: {
    file: "@apollo/client/__cjs/core/ApolloClient.cjs",
    condition: "options.query",

    message: "query option is required. You must specify your GraphQL document " +
        "in the query option."
  },

  75: {
    file: "@apollo/client/__cjs/core/ApolloClient.cjs",
    condition: "options.query.kind === \"Document\"",
    message: 'You must wrap the query string in a "gql" tag.'
  },

  76: {
    file: "@apollo/client/__cjs/core/ApolloClient.cjs",
    condition: "!options.returnPartialData",
    message: "returnPartialData option only supported on watchQuery."
  },

  77: {
    file: "@apollo/client/__cjs/core/ApolloClient.cjs",
    condition: "!options.pollInterval",
    message: "pollInterval option only supported on watchQuery."
  },

  78: {
    file: "@apollo/client/__cjs/core/ApolloClient.cjs",
    condition: "!options.notifyOnNetworkStatusChange",
    message: "notifyOnNetworkStatusChange option only supported on watchQuery."
  },

  79: {
    file: "@apollo/client/__cjs/core/ApolloClient.cjs",
    condition: "optionsWithDefaults.mutation",
    message: "The `mutation` option is required. Please provide a GraphQL document in the `mutation` option."
  },

  80: {
    file: "@apollo/client/__cjs/core/ApolloClient.cjs",
    condition: "optionsWithDefaults.fetchPolicy === \"network-only\" ||\n    optionsWithDefaults.fetchPolicy === \"no-cache\"",
    message: "Mutations only support 'network-only' or 'no-cache' fetch policies. The default 'network-only' behavior automatically writes mutation results to the cache. Passing 'no-cache' skips the cache write."
  },

  82: {
    file: "@apollo/client/__cjs/core/ObservableQuery.cjs",
    condition: "fetchPolicy === \"standby\"",
    message: "The `variablesUnknown` option can only be used together with a `standby` fetch policy."
  },

  84: {
    file: "@apollo/client/__cjs/core/ObservableQuery.cjs",
    condition: "this.options.fetchPolicy !== \"cache-only\"",
    message: "Cannot execute `fetchMore` for 'cache-only' query '%s'. Please use a different fetch policy."
  },

  85: {
    file: "@apollo/client/__cjs/core/ObservableQuery.cjs",
    condition: "updateQuery",
    message: "You must provide an `updateQuery` function when using `fetchMore` with a `no-cache` fetch policy."
  },

  89: {
    file: "@apollo/client/__cjs/core/QueryManager.cjs",
    message: "QueryManager stopped while query was in flight"
  },

  90: {
    file: "@apollo/client/__cjs/core/QueryManager.cjs",
    condition: "this.localState",
    message: "Mutation '%s' contains `@client` fields with variables provided by `@export` but local state has not been configured."
  },

  91: {
    file: "@apollo/client/__cjs/core/QueryManager.cjs",
    message: "Store reset while query was in flight (not completed in link chain)"
  },

  94: {
    file: "@apollo/client/__cjs/core/QueryManager.cjs",
    condition: "!this.getDocumentInfo(query).hasClientExports || this.localState",
    message: "Subscription '%s' contains `@client` fields with variables provided by `@export` but local state has not been configured."
  },

  95: {
    file: "@apollo/client/__cjs/core/QueryManager.cjs",
    condition: "this.localState",
    message: "%s '%s' contains `@client` fields but local state has not been configured."
  },

  96: {
    file: "@apollo/client/__cjs/core/QueryManager.cjs",
    condition: "!hasIncrementalDirective",
    message: "%s '%s' contains `@client` and `@defer` directives. These cannot be used together."
  },

  97: {
    file: "@apollo/client/__cjs/core/QueryManager.cjs",
    condition: "this.localState",
    message: "Query '%s' contains `@client` fields with variables provided by `@export` but local state has not been configured."
  },

  99: {
    file: "@apollo/client/__cjs/core/QueryManager.cjs",
    condition: "this.localState",
    message: "Query '%s' contains `@client` fields but local state has not been configured."
  },

  100: {
    file: "@apollo/client/__cjs/core/QueryManager.cjs",
    condition: "didEmitValue",
    message: "The link chain completed without emitting a value. This is likely unintentional and should be updated to emit a value before completing."
  },

  104: {
    file: "@apollo/client/__cjs/cache/inmemory/entityStore.cjs",
    condition: "typeof dataId === \"string\"",
    message: "store.merge expects a string ID"
  },

  107: {
    file: "@apollo/client/__cjs/cache/inmemory/key-extractor.cjs",
    condition: "extracted !== void 0",
    message: `Missing field '%s' while extracting keyFields from %s`
  },

  108: {
    file: "@apollo/client/__cjs/cache/inmemory/policies.cjs",
    condition: "!old || old === which",
    message: `Cannot change root %s __typename more than once`
  },

  111: {
    file: "@apollo/client/__cjs/cache/inmemory/policies.cjs",
    message: "Cannot automatically merge arrays"
  },

  112: {
    file: "@apollo/client/__cjs/cache/inmemory/readFromStore.cjs",
    message: `No fragment named %s`
  },

  113: {
    file: "@apollo/client/__cjs/cache/inmemory/readFromStore.cjs",
    condition: "!(0, utilities_1.isReference)(value)",
    message: `Missing selection set for object of type %s returned for query field %s`
  },

  114: {
    file: "@apollo/client/__cjs/cache/inmemory/writeToStore.cjs",
    message: `Could not identify object %s`
  },

  116: {
    file: "@apollo/client/__cjs/cache/inmemory/writeToStore.cjs",
    message: `No fragment named %s`
  }
};

exports.devDebug = {
  81: {
    file: "@apollo/client/__cjs/core/ApolloClient.cjs",
    message: `In client.refetchQueries, Promise.all promise rejected with error %o`
  },

  88: {
    file: "@apollo/client/__cjs/core/ObservableQuery.cjs",
    message: `Missing cache result fields: %o`
  }
};

exports.devLog = {};

exports.devWarn = {
  36: {
    file: "@apollo/client/__cjs/react/hooks/internal/validateSuspenseHookOptions.cjs",
    message: "Using `returnPartialData` with a `no-cache` fetch policy has no effect. To read partial data from the cache, consider using an alternate fetch policy."
  },

  40: {
    file: "@apollo/client/__cjs/masking/maskDefinition.cjs",
    message: "Accessing unmasked field on %s at path '%s'. This field will not be available when masking is enabled. Please read the field from the fragment instead."
  },

  44: {
    file: "@apollo/client/__cjs/masking/utils.cjs",
    message: "@unmask 'mode' argument does not support variables."
  },

  45: {
    file: "@apollo/client/__cjs/masking/utils.cjs",
    message: "@unmask 'mode' argument must be of type string."
  },

  46: {
    file: "@apollo/client/__cjs/masking/utils.cjs",
    message: "@unmask 'mode' argument does not recognize value '%s'."
  },

  50: {
    file: "@apollo/client/__cjs/local-state/LocalState.cjs",
    message: "The '%s' field resolves the value from the cache, for example from a 'read' function, but a 'no-cache' fetch policy was used. The field value has been set to `null`. Either define a local resolver or use a fetch policy that uses the cache to ensure the field is resolved correctly."
  },

  51: {
    file: "@apollo/client/__cjs/local-state/LocalState.cjs",
    message: "Could not find a resolver for the '%s' field nor does the cache resolve the field. The field value has been set to `null`. Either define a resolver for the field or ensure the cache can resolve the value, for example, by adding a 'read' function to a field policy in 'InMemoryCache'."
  },

  52: {
    file: "@apollo/client/__cjs/local-state/LocalState.cjs",
    message: "The '%s' resolver returned `undefined` instead of a value. This is likely a bug in the resolver. If you didn't mean to return a value, return `null` instead."
  },

  53: {
    file: "@apollo/client/__cjs/local-state/LocalState.cjs",
    message: "The '%s' field had no cached value and only forced resolvers were run. The value was set to `null`."
  },

  54: {
    file: "@apollo/client/__cjs/local-state/LocalState.cjs",
    message: "The '%s' field on object %o returned `undefined` instead of a value. The parent resolver did not include the property in the returned value and there was no resolver defined for the field."
  },

  58: {
    file: "@apollo/client/__cjs/link/ws/index.cjs",
    message: "`WebSocketLink` uses the deprecated and unmaintained `subscriptions-transport-ws` library. This link is no longer maintained and will be removed in a future major version of Apollo Client. We recommend switching to `GraphQLWsLink` which uses the `graphql-ws` library to send GraphQL operations through WebSocket connections (https://the-guild.dev/graphql/ws)."
  },

  63: {
    file: "@apollo/client/__cjs/link/core/ApolloLink.cjs",
    message: "[ApolloLink.split]: The test function returned a non-boolean value which could result in subtle bugs (e.g. such as using an `async` function which always returns a truthy value). Got `%o`."
  },

  64: {
    file: "@apollo/client/__cjs/link/core/ApolloLink.cjs",

    message: "The terminating link provided to `ApolloLink.execute` called `forward` instead of handling the request. " +
        "This results in an observable that immediately completes and does not emit a value. " +
        "Please provide a terminating link that properly handles the request.\n\n" +
        "If you are using a split link, ensure each branch contains a terminating link that handles the request."
  },

  70: {
    file: "@apollo/client/__cjs/core/ApolloClient.cjs",
    message: "`refetchOn` was set on query '%s' but no `RefetchEventManager` is configured on this `ApolloClient` instance. This option has no effect until a RefetchEventManager is connected to this client. Pass a `RefetchEventManager` instance to the `refetchEventManager` option on the `ApolloClient` constructor."
  },

  71: {
    file: "@apollo/client/__cjs/core/ApolloClient.cjs",
    message: "`refetchOn` references the '%s' event on query '%s' but no source is configured for it on the `RefetchEventManager`. This event will never fire. Add a source for the event to the `sources` option or call `setEventSource` on the refetch event manager."
  },

  83: {
    file: "@apollo/client/__cjs/core/ObservableQuery.cjs",

    message: `Called refetch(%o) for query %o, which does not declare a $variables variable.
Did you mean to call refetch(variables) instead of refetch({ variables })?`
  },

  87: {
    file: "@apollo/client/__cjs/core/ObservableQuery.cjs",
    message: "Cannot poll on 'cache-only' query '%s' and as such, polling is disabled. Please use a different fetch policy."
  },

  92: {
    file: "@apollo/client/__cjs/core/QueryManager.cjs",
    message: `Unknown query named "%s" requested in refetchQueries options.include array`
  },

  93: {
    file: "@apollo/client/__cjs/core/QueryManager.cjs",
    message: `Unknown anonymous query requested in refetchQueries options.include array`
  },

  98: {
    file: "@apollo/client/__cjs/core/QueryManager.cjs",
    message: '[%s]: Fragments masked by data masking are inaccessible when using fetch policy "no-cache". Please add `@unmask` to each fragment spread to access the data.'
  },

  101: {
    file: "@apollo/client/__cjs/core/RefetchEventManager.cjs",
    message: "Connected an `ApolloClient` instance to a `RefetchEventManager` that was already connected to a different `ApolloClient`. The previous client has been disconnected and will no longer receive refetch events from this manager."
  },

  102: {
    file: "@apollo/client/__cjs/core/RefetchEventManager.cjs",
    message: "Received '%s' event but an `ApolloClient` instance is not connected to the `RefetchEventManager`. No queries will refetch. Pass the manager to the `refetchEventManager` option on the `ApolloClient` constructor."
  },

  103: {
    file: "@apollo/client/__cjs/core/RefetchEventManager.cjs",
    message: "Received '%s' event but no source is configured for it on the `RefetchEventManager`. No queries will refetch. Add the event to the `sources` option or call `setEventSource`."
  },

  105: {
    file: "@apollo/client/__cjs/cache/inmemory/entityStore.cjs",

    message: "cache.modify: You are trying to write a Reference that is not part of the store: %o\n" +
        "Please make sure to set the `mergeIntoStore` parameter to `true` when creating a Reference that is not part of the store yet:\n" +
        "`toReference(object, true)`"
  },

  106: {
    file: "@apollo/client/__cjs/cache/inmemory/entityStore.cjs",

    message: "cache.modify: Writing an array with a mix of both References and Objects will not result in the Objects being normalized correctly.\n" +
        "Please convert the object instance %o to a Reference before writing it to the cache by calling `toReference(object, true)`."
  },

  109: {
    file: "@apollo/client/__cjs/cache/inmemory/policies.cjs",
    message: `Inferring subtype %s of supertype %s`
  },

  110: {
    file: "@apollo/client/__cjs/cache/inmemory/policies.cjs",
    message: `Undefined 'from' passed to readField with arguments %s`
  },

  117: {
    file: "@apollo/client/__cjs/cache/inmemory/writeToStore.cjs",

    message: `Cache data may be lost when replacing the %s field of a %s object.

This could cause additional (usually avoidable) network requests to fetch data that were otherwise cached.

To address this problem (which is not a bug in Apollo Client), %sdefine a custom merge function for the %s field, so InMemoryCache can safely merge these objects:

  existing: %o
  incoming: %o

For more information about these options, please refer to the documentation:

  * Ensuring entity objects have IDs: https://go.apollo.dev/c/generating-unique-identifiers
  * Defining custom merge functions: https://go.apollo.dev/c/merging-non-normalized-objects
`
  },

  118: {
    file: "@apollo/client/__cjs/cache/core/cache.cjs",
    message: "Could not identify object passed to `from` for '%s' fragment, either because the object is non-normalized or the key fields are missing. If you are masking this object, please ensure the key fields are requested by the parent object."
  }
};

exports.devError = {
  14: {
    file: "@apollo/client/__cjs/utilities/internal/removeDirectivesFromDocument.cjs",
    message: `Could not find operation or fragment`
  },

  34: {
    file: "@apollo/client/__cjs/react/hooks/useSyncExternalStore.cjs",
    message: "The result of getSnapshot should be cached to avoid an infinite loop"
  },

  86: {
    file: "@apollo/client/__cjs/core/ObservableQuery.cjs",
    message: "Unhandled GraphQL subscription error"
  },

  115: {
    file: "@apollo/client/__cjs/cache/inmemory/writeToStore.cjs",
    message: `Missing field '%s' while writing result %o`
  }
};
