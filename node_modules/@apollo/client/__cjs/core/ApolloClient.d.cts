import type { DocumentNode } from "graphql";
import type { Observable } from "rxjs";
import type { InternalTypes } from "@apollo/client";
import type { ApolloCache, Cache, IgnoreModifier, Reference } from "@apollo/client/cache";
import type { Incremental } from "@apollo/client/incremental";
import type { ApolloLink } from "@apollo/client/link";
import type { ClientAwarenessLink } from "@apollo/client/link/client-awareness";
import type { LocalState } from "@apollo/client/local-state";
import type { MaybeMasked, Unmasked } from "@apollo/client/masking";
import { DocumentTransform } from "@apollo/client/utilities";
import type { LazyType, OptionWithFallback, SignatureStyle, VariablesOption, variablesUnknownSymbol } from "@apollo/client/utilities/internal";
import { getApolloClientMemoryInternals } from "@apollo/client/utilities/internal";
import type { DeclareDefaultOptions, DefaultOptions } from "./defaultOptions.cjs";
import type { ObservableQuery } from "./ObservableQuery.cjs";
import type { RefetchEventManager } from "./RefetchEventManager.cjs";
import type { DefaultContext, ErrorLike, InternalRefetchQueriesInclude, InternalRefetchQueriesResult, MutationQueryReducersMap, MutationUpdaterFunction, NormalizedExecutionResult, OnQueryUpdated, OperationVariables, RefetchOn, RefetchQueriesInclude, RefetchQueriesPromiseResults, SubscriptionObservable, TypedDocumentNode } from "./types.cjs";
import type { ErrorPolicy, FetchPolicy, MutationFetchPolicy, NextFetchPolicyContext, RefetchWritePolicy, WatchQueryFetchPolicy } from "./watchQueryOptions.cjs";
/**
* @knipignore
* @internal
* For some reason, without this export the build stop drops references to `DefaultOptions` and `DeclareDefaultOptions`, resulting in a broken build.
* Adding this fixes that, although it's not particularly elegant.
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
export interface ReferenceToAvoidDroppingImportOnBuild {
    _1: DeclareDefaultOptions.Mutate;
    _2: DefaultOptions;
}
export declare namespace ApolloClient {
    export type { DeclareDefaultOptions, DefaultOptions };
    export namespace DocumentationTypes {
        interface DefaultOptions {
            watchQuery?: Partial<ApolloClient.WatchQueryOptions<any, any>>;
            query?: Partial<ApolloClient.QueryOptions<any, any>>;
            mutate?: Partial<ApolloClient.MutateOptions<any, any, any>>;
        }
    }
    export interface Options extends InternalTypes.DefaultOptionsParentObject {
        /**
         * An `ApolloLink` instance to serve as Apollo Client's network layer. For more information, see [Advanced HTTP networking](https://www.apollographql.com/docs/react/networking/advanced-http-networking/).
         */
        link: ApolloLink;
        /**
         * The cache that Apollo Client should use to store query results locally. The recommended cache is `InMemoryCache`, which is provided by the `@apollo/client` package.
         *
         * For more information, see [Configuring the cache](https://www.apollographql.com/docs/react/caching/cache-configuration/).
         */
        cache: ApolloCache;
        /**
         * The time interval (in milliseconds) before Apollo Client force-fetches queries after a server-side render.
         *
         * @defaultValue `0` (no delay)
         */
        ssrForceFetchDelay?: number;
        /**
         * When using Apollo Client for [server-side rendering](https://www.apollographql.com/docs/react/performance/server-side-rendering/), set this to `true` so that the [`getDataFromTree` function](../react/ssr/#getdatafromtree) can work effectively.
         *
         * @defaultValue `false`
         */
        ssrMode?: boolean;
        /**
         * If `false`, Apollo Client sends every created query to the server, even if a _completely_ identical query (identical in terms of query string, variable values, and operationName) is already in flight.
         *
         * @defaultValue `true`
         */
        queryDeduplication?: boolean;
        defaultContext?: Partial<DefaultContext>;
        /**
         * If `true`, Apollo Client will assume results read from the cache are never mutated by application code, which enables substantial performance optimizations.
         *
         * @defaultValue `false`
         */
        assumeImmutableResults?: boolean;
        localState?: LocalState;
        /**
        * 
        */
        clientAwareness?: ClientAwarenessLink.ClientAwarenessOptions;
        /**
        * 
        */
        enhancedClientAwareness?: ClientAwarenessLink.EnhancedClientAwarenessOptions;
        documentTransform?: DocumentTransform;
        /**
         * Configuration used by the [Apollo Client Devtools extension](https://www.apollographql.com/docs/react/development-testing/developer-tooling/#apollo-client-devtools) for this client.
         *
         * @since 3.11.0
         */
        devtools?: ApolloClient.DevtoolsOptions;
        /**
         * Determines if data masking is enabled for the client.
         *
         * @defaultValue false
         */
        dataMasking?: boolean;
        /**
         * Determines the strategy used to parse incremental chunks from `@defer`
         * queries.
         */
        incrementalHandler?: Incremental.Handler<any>;
        /**
         * @experimental
         * Allows passing in "experiments", experimental features that might one day
         * become part of Apollo Client's core functionality.
         * Keep in mind that these features might change the core of Apollo Client.
         * Do not pass in experiments that are not provided by Apollo.
         */
        experiments?: ApolloClient.Experiment[];
        /**
         * The `RefetchEventManager` instance that manages automatic refetches for
         * the client.
         */
        refetchEventManager?: RefetchEventManager;
    }
    export interface DevtoolsOptions {
        /**
         * If `true`, the [Apollo Client Devtools](https://www.apollographql.com/docs/react/development-testing/developer-tooling/#apollo-client-devtools) browser extension can connect to this `ApolloClient` instance.
         *
         * The default value is `false` in production and `true` in development if there is a `window` object.
         */
        enabled?: boolean;
        /**
         * Optional name for this `ApolloClient` instance in the devtools. This is
         * useful when you instantiate multiple clients and want to be able to
         * identify them by name.
         */
        name?: string;
    }
    export type MutateOptions<TData = unknown, TVariables extends OperationVariables = OperationVariables, TCache extends ApolloCache = ApolloCache> = {
        /**
        * By providing either an object or a callback function that, when invoked after
        * a mutation, allows you to return optimistic data and optionally skip updates
        * via the `IGNORE` sentinel object, Apollo Client caches this temporary
        * (and potentially incorrect) response until the mutation completes, enabling
        * more responsive UI updates.
        * 
        * For more information, see [Optimistic mutation results](https://www.apollographql.com/docs/react/performance/optimistic-ui/).
        * 
        * @docGroup 3. Caching options
        */
        optimisticResponse?: Unmasked<NoInfer<TData>> | ((vars: TVariables, { IGNORE }: {
            IGNORE: IgnoreModifier;
        }) => Unmasked<NoInfer<TData>> | IgnoreModifier);
        /**
        * A `MutationQueryReducersMap`, which is map from query names to
        * mutation query reducers. Briefly, this map defines how to incorporate the
        * results of the mutation into the results of queries that are currently
        * being watched by your application.
        */
        updateQueries?: MutationQueryReducersMap<TData>;
        /**
        * An array (or a function that _returns_ an array) that specifies which queries you want to refetch after the mutation occurs.
        * 
        * Each array value can be either:
        * 
        * - An object containing the `query` to execute, along with any `variables`
        * 
        * - A string indicating the operation name of the query to refetch
        * 
        * @docGroup 1. Operation options
        */
        refetchQueries?: ((result: NormalizedExecutionResult<Unmasked<TData>>) => InternalRefetchQueriesInclude) | InternalRefetchQueriesInclude;
        /**
        * If `true`, makes sure all queries included in `refetchQueries` are completed before the mutation is considered complete.
        * 
        * The default value is `false` (queries are refetched asynchronously).
        * 
        * @docGroup 1. Operation options
        */
        awaitRefetchQueries?: boolean;
        /**
        * A function used to update the Apollo Client cache after the mutation completes.
        * 
        * For more information, see [Updating the cache after a mutation](https://www.apollographql.com/docs/react/data/mutations#updating-the-cache-after-a-mutation).
        * 
        * @docGroup 3. Caching options
        */
        update?: MutationUpdaterFunction<TData, TVariables, TCache>;
        /**
        * Optional callback for intercepting queries whose cache data has been updated by the mutation, as well as any queries specified in the `refetchQueries: [...]` list passed to `client.mutate`.
        * 
        * Returning a `Promise` from `onQueryUpdated` will cause the final mutation `Promise` to await the returned `Promise`. Returning `false` causes the query to be ignored.
        * 
        * @docGroup 1. Operation options
        */
        onQueryUpdated?: OnQueryUpdated<any>;
        /**
        * Specifies how the mutation handles a response that returns both GraphQL errors and partial results.
        * 
        * For details, see [GraphQL error policies](https://www.apollographql.com/docs/react/data/error-handling/#graphql-error-policies).
        * 
        * The default value is `none`, meaning that the mutation result includes error details but _not_ partial results.
        * 
        * @docGroup 1. Operation options
        */
        errorPolicy?: ErrorPolicy;
        /**
        * If you're using [Apollo Link](https://www.apollographql.com/docs/react/api/link/introduction/), this object is the initial value of the `context` object that's passed along your link chain.
        * 
        * @docGroup 2. Networking options
        */
        context?: DefaultContext;
        /**
        * Provide `no-cache` if the mutation's result should _not_ be written to the Apollo Client cache.
        * 
        * The default value is `network-only` (which means the result _is_ written to the cache).
        * 
        * Unlike queries, mutations _do not_ support [fetch policies](https://www.apollographql.com/docs/react/data/queries/#setting-a-fetch-policy) besides `network-only` and `no-cache`.
        * 
        * @docGroup 3. Caching options
        */
        fetchPolicy?: MutationFetchPolicy;
        /**
        * To avoid retaining sensitive information from mutation root field
        * arguments, Apollo Client v3.4+ automatically clears any `ROOT_MUTATION`
        * fields from the cache after each mutation finishes. If you need this
        * information to remain in the cache, you can prevent the removal by passing
        * `keepRootFields: true` to the mutation. `ROOT_MUTATION` result data are
        * also passed to the mutation `update` function, so we recommend obtaining
        * the results that way, rather than using this option, if possible.
        */
        keepRootFields?: boolean;
        /**
        * A GraphQL document, often created with `gql` from the `graphql-tag`
        * package, that contains a single mutation inside of it.
        * 
        * @docGroup 1. Operation options
        */
        mutation: DocumentNode | TypedDocumentNode<TData, TVariables>;
    } & VariablesOption<NoInfer<TVariables>>;
    export namespace mutate {
        interface DefaultOptions extends ApolloClient.DefaultOptions.Mutate.Calculated {
        }
        type ResultForOptions<TData, TVariables extends OperationVariables, TCache extends ApolloCache, TOptions extends Record<string, unknown> | MutateOptions<any, TVariables, TCache>> = LazyType<MutateResult<MaybeMasked<TData>, OptionWithFallback<TOptions, DefaultOptions, "errorPolicy"> & ErrorPolicy>>;
        namespace Signatures {
            interface Classic {
                /**
                * This resolves a single mutation according to the options specified and returns a
                * Promise which is either resolved with the resulting data or rejected with an
                * error. In some cases both `data` and `errors` might be undefined, for example
                * when `errorPolicy` is set to `'ignore'`.
                * 
                * It takes options as an object with the following keys and values:
                */
                <TData, TVariables extends OperationVariables, _INFERENCE_ONLY_DO_NOT_SPECIFY extends "inferred", TErrorPolicy extends ErrorPolicy | undefined = undefined>(options: ApolloClient.MutateOptions<TData, TVariables, ApolloCache> & {
                    errorPolicy?: TErrorPolicy;
                }): Promise<ApolloClient.MutateResult<MaybeMasked<TData>, TErrorPolicy>>;
                /**
                * @deprecated Avoid manually specifying generics on `client.mutate`.
                * Instead, rely on TypeScript's type inference along with a correctly typed `TypedDocumentNode` to get accurate types for your mutation results.
                *
                *
                * This resolves a single mutation according to the options specified and returns a
                * Promise which is either resolved with the resulting data or rejected with an
                * error. In some cases both `data` and `errors` might be undefined, for example
                * when `errorPolicy` is set to `'ignore'`.
                * 
                * It takes options as an object with the following keys and values:
                */
                <TData, TVariables extends OperationVariables = OperationVariables, TCache extends ApolloCache = ApolloCache, TErrorPolicy extends ErrorPolicy | undefined = undefined>(options: ApolloClient.MutateOptions<TData, TVariables, TCache> & (TErrorPolicy extends undefined ? {} : {
                    errorPolicy: TErrorPolicy;
                })): Promise<ApolloClient.MutateResult<MaybeMasked<TData>, TErrorPolicy>>;
            }
            interface Modern {
                /**
                * This resolves a single mutation according to the options specified and returns a
                * Promise which is either resolved with the resulting data or rejected with an
                * error. In some cases both `data` and `errors` might be undefined, for example
                * when `errorPolicy` is set to `'ignore'`.
                * 
                * It takes options as an object with the following keys and values:
                */
                <TData, TVariables extends OperationVariables, TCache extends ApolloCache, TOptions extends ApolloClient.MutateOptions<NoInfer<TData>, NoInfer<TVariables>, TCache> & VariablesOption<TVariables & {
                    [K in Exclude<keyof TOptions["variables"], keyof TVariables>]?: never;
                }>>(options: TOptions & {
                    mutation: TypedDocumentNode<TData, TVariables>;
                }): Promise<ApolloClient.mutate.ResultForOptions<TData, TVariables, TCache, TOptions>>;
            }
            type Evaluated = SignatureStyle extends "classic" ? Classic : Modern;
        }
        /**
        * This resolves a single mutation according to the options specified and returns a
        * Promise which is either resolved with the resulting data or rejected with an
        * error. In some cases both `data` and `errors` might be undefined, for example
        * when `errorPolicy` is set to `'ignore'`.
        * 
        * It takes options as an object with the following keys and values:
        */
        interface Signature extends Signatures.Evaluated {
        }
    }
    export type MutateResultMap<TData = unknown> = {
        none: {
            /**
            * The data returned from your mutation. Can be `undefined` if the `errorPolicy`
            * is `all` or `ignore` and the server returns a GraphQL response with `errors`
            * but not `data` or a network error is returned.
            */
            data: TData;
            /**
            * If the mutation produces one or more errors, this object contains either an array of `graphQLErrors` or a single `networkError`. Otherwise, this value is `undefined`.
            * 
            * For more information, see [Handling operation errors](https://www.apollographql.com/docs/react/data/error-handling/).
            */
            error?: never;
        };
        all: {
            /**
            * The data returned from your mutation. Can be `undefined` if the `errorPolicy`
            * is `all` or `ignore` and the server returns a GraphQL response with `errors`
            * but not `data` or a network error is returned.
            */
            data: TData | undefined;
            /**
            * If the mutation produces one or more errors, this object contains either an array of `graphQLErrors` or a single `networkError`. Otherwise, this value is `undefined`.
            * 
            * For more information, see [Handling operation errors](https://www.apollographql.com/docs/react/data/error-handling/).
            */
            error?: ErrorLike;
        };
        ignore: {
            /**
            * The data returned from your mutation. Can be `undefined` if the `errorPolicy`
            * is `all` or `ignore` and the server returns a GraphQL response with `errors`
            * but not `data` or a network error is returned.
            */
            data: TData | undefined;
            /**
            * If the mutation produces one or more errors, this object contains either an array of `graphQLErrors` or a single `networkError`. Otherwise, this value is `undefined`.
            * 
            * For more information, see [Handling operation errors](https://www.apollographql.com/docs/react/data/error-handling/).
            */
            error?: never;
        };
        undefined: {
            /**
            * The data returned from your mutation. Can be `undefined` if the `errorPolicy`
            * is `all` or `ignore` and the server returns a GraphQL response with `errors`
            * but not `data` or a network error is returned.
            */
            data: TData | undefined;
            /**
            * If the mutation produces one or more errors, this object contains either an array of `graphQLErrors` or a single `networkError`. Otherwise, this value is `undefined`.
            * 
            * For more information, see [Handling operation errors](https://www.apollographql.com/docs/react/data/error-handling/).
            */
            error?: ErrorLike;
        };
    };
    export type MutateResult<TData = unknown, TErrorPolicy extends ErrorPolicy | undefined = undefined> = MutateResultMap<TData>[`${TErrorPolicy}`] & {
        /**
        * Custom extensions returned from the GraphQL server
        */
        extensions?: Record<string, unknown>;
    };
    /**
     * Query options.
     */
    export type QueryOptions<TData = unknown, TVariables extends OperationVariables = OperationVariables> = {
        /**
        * A GraphQL query string parsed into an AST with the gql template literal.
        * 
        * @docGroup 1. Operation options
        */
        query: DocumentNode | TypedDocumentNode<TData, TVariables>;
        /**
        * Specifies how the query handles a response that returns both GraphQL errors and partial results.
        * 
        * For details, see [GraphQL error policies](https://www.apollographql.com/docs/react/data/error-handling/#graphql-error-policies).
        * 
        * The default value is `none`, meaning that the query result includes error details but not partial results.
        * 
        * @docGroup 1. Operation options
        */
        errorPolicy?: ErrorPolicy;
        /**
        * If you're using [Apollo Link](https://www.apollographql.com/docs/react/api/link/introduction/), this object is the initial value of the `context` object that's passed along your link chain.
        * 
        * @docGroup 2. Networking options
        */
        context?: DefaultContext;
        /**
        * Specifies how the query interacts with the Apollo Client cache during execution (for example, whether it checks the cache for results before sending a request to the server).
        * 
        * For details, see [Setting a fetch policy](https://www.apollographql.com/docs/react/data/queries/#setting-a-fetch-policy).
        * 
        * The default value is `cache-first`.
        * 
        * @docGroup 3. Caching options
        */
        fetchPolicy?: FetchPolicy;
    } & VariablesOption<NoInfer<TVariables>>;
    export type QueryResultMap<TData = unknown> = {
        none: {
            /**
            * An object containing the result of your GraphQL query after it completes.
            * 
            * This value might be `undefined` if a query results in one or more errors (depending on the query's `errorPolicy`).
            * 
            * @docGroup 1. Operation data
            */
            data: TData;
            /**
            * A single ErrorLike object describing the error that occurred during the latest
            * query execution.
            * 
            * For more information, see [Handling operation errors](https://www.apollographql.com/docs/react/data/error-handling/).
            * 
            * @docGroup 1. Operation data
            */
            error?: never;
        };
        all: {
            /**
            * An object containing the result of your GraphQL query after it completes.
            * 
            * This value might be `undefined` if a query results in one or more errors (depending on the query's `errorPolicy`).
            * 
            * @docGroup 1. Operation data
            */
            data: TData | undefined;
            /**
            * A single ErrorLike object describing the error that occurred during the latest
            * query execution.
            * 
            * For more information, see [Handling operation errors](https://www.apollographql.com/docs/react/data/error-handling/).
            * 
            * @docGroup 1. Operation data
            */
            error?: ErrorLike;
        };
        ignore: {
            /**
            * An object containing the result of your GraphQL query after it completes.
            * 
            * This value might be `undefined` if a query results in one or more errors (depending on the query's `errorPolicy`).
            * 
            * @docGroup 1. Operation data
            */
            data: TData | undefined;
            /**
            * A single ErrorLike object describing the error that occurred during the latest
            * query execution.
            * 
            * For more information, see [Handling operation errors](https://www.apollographql.com/docs/react/data/error-handling/).
            * 
            * @docGroup 1. Operation data
            */
            error?: never;
        };
        undefined: {
            /**
            * An object containing the result of your GraphQL query after it completes.
            * 
            * This value might be `undefined` if a query results in one or more errors (depending on the query's `errorPolicy`).
            * 
            * @docGroup 1. Operation data
            */
            data: TData | undefined;
            /**
            * A single ErrorLike object describing the error that occurred during the latest
            * query execution.
            * 
            * For more information, see [Handling operation errors](https://www.apollographql.com/docs/react/data/error-handling/).
            * 
            * @docGroup 1. Operation data
            */
            error?: ErrorLike;
        };
    };
    export type QueryResult<TData = unknown, TErrorPolicy extends ErrorPolicy | undefined = undefined> = QueryResultMap<TData>[`${TErrorPolicy}`];
    export namespace query {
        interface DefaultOptions extends ApolloClient.DefaultOptions.Query.Calculated {
        }
        type ResultForOptions<TData, TVariables extends OperationVariables, TOptions extends Record<string, unknown> | QueryOptions<any, TVariables>> = LazyType<QueryResult<MaybeMasked<TData>, OptionWithFallback<TOptions, DefaultOptions, "errorPolicy"> & ErrorPolicy>>;
        namespace Signatures {
            interface Classic {
                /**
                * This resolves a single query according to the options specified and
                * returns a `Promise` which is either resolved with the resulting data
                * or rejected with an error.
                * 
                * @param options - An object of type `QueryOptions` that allows us to
                * describe how this query should be treated e.g. whether it should hit the
                * server at all or just resolve from the cache, etc.
                */
                <TData, TVariables extends OperationVariables, _INFERENCE_ONLY_DO_NOT_SPECIFY extends "inferred", TErrorPolicy extends ErrorPolicy | undefined = undefined>(options: ApolloClient.QueryOptions<TData, TVariables> & {
                    errorPolicy?: TErrorPolicy;
                }): Promise<ApolloClient.QueryResult<MaybeMasked<TData>, TErrorPolicy>>;
                /**
                * @deprecated Avoid manually specifying generics on `client.query`.
                * Instead, rely on TypeScript's type inference along with a correctly typed `TypedDocumentNode` to get accurate types for your query results.
                *
                *
                * This resolves a single query according to the options specified and
                * returns a `Promise` which is either resolved with the resulting data
                * or rejected with an error.
                * 
                * @param options - An object of type `QueryOptions` that allows us to
                * describe how this query should be treated e.g. whether it should hit the
                * server at all or just resolve from the cache, etc.
                */
                <TData, TVariables extends OperationVariables = OperationVariables, TErrorPolicy extends ErrorPolicy | undefined = undefined>(options: ApolloClient.QueryOptions<TData, TVariables> & (TErrorPolicy extends undefined ? {} : {
                    errorPolicy: TErrorPolicy;
                })): Promise<ApolloClient.QueryResult<MaybeMasked<TData>, TErrorPolicy>>;
            }
            interface Modern {
                /**
                * This resolves a single query according to the options specified and
                * returns a `Promise` which is either resolved with the resulting data
                * or rejected with an error.
                * 
                * @param options - An object of type `QueryOptions` that allows us to
                * describe how this query should be treated e.g. whether it should hit the
                * server at all or just resolve from the cache, etc.
                */
                <TData, TVariables extends OperationVariables, TOptions extends ApolloClient.QueryOptions<NoInfer<TData>, NoInfer<TVariables>> & VariablesOption<TVariables & {
                    [K in Exclude<keyof TOptions["variables"], keyof TVariables>]?: never;
                }>>(options: TOptions & {
                    query: TypedDocumentNode<TData, TVariables>;
                }): Promise<ApolloClient.query.ResultForOptions<TData, TVariables, TOptions>>;
            }
            type Evaluated = SignatureStyle extends "classic" ? Classic : Modern;
        }
        /**
        * This resolves a single query according to the options specified and
        * returns a `Promise` which is either resolved with the resulting data
        * or rejected with an error.
        * 
        * @param options - An object of type `QueryOptions` that allows us to
        * describe how this query should be treated e.g. whether it should hit the
        * server at all or just resolve from the cache, etc.
        */
        interface Signature extends Signatures.Evaluated {
        }
    }
    /**
     * Options object for the `client.refetchQueries` method.
     */
    export interface RefetchQueriesOptions<TCache extends ApolloCache, TResult> {
        /**
         * Optional function that updates cached fields to trigger refetches of queries that include those fields.
         */
        updateCache?: (cache: TCache) => void;
        /**
         * Optional array specifying queries to refetch. Each element can be either a query's string name or a `DocumentNode` object.
         *
         * Pass `"active"` as a shorthand to refetch all active queries, or `"all"` to refetch all active and inactive queries.
         *
         * Analogous to the [`options.refetchQueries`](https://www.apollographql.com/docs/react/data/mutations/#options) array for mutations.
         */
        include?: RefetchQueriesInclude;
        /**
         * If `true`, the `options.updateCache` function is executed on a temporary optimistic layer of `InMemoryCache`, so its modifications can be discarded from the cache after observing which fields it invalidated.
         *
         * Defaults to `false`, meaning `options.updateCache` updates the cache in a lasting way.
         */
        optimistic?: boolean;
        /**
         * Optional callback function that's called once for each `ObservableQuery` that's either affected by `options.updateCache` or listed in `options.include` (or both).
         *
         * If `onQueryUpdated` is not provided, the default implementation returns the result of calling `observableQuery.refetch()`. When `onQueryUpdated` is provided, it can dynamically decide whether (and how) each query should be refetched.
         *
         * Returning `false` from `onQueryUpdated` prevents the associated query from being refetched.
         */
        onQueryUpdated?: OnQueryUpdated<TResult> | null;
    }
    /**
     * The result of client.refetchQueries is thenable/awaitable, if you just want
     * an array of fully resolved results, but you can also access the raw results
     * immediately by examining the additional `queries` and `results` properties of
     * the `RefetchQueriesResult<TResult> object`.
     */
    export interface RefetchQueriesResult<TResult> extends Promise<RefetchQueriesPromiseResults<TResult>>, RefetchQueriesResult.AdditionalProperties<TResult> {
    }
    export namespace RefetchQueriesResult {
        interface AdditionalProperties<TResult> {
            /**
             * An array of ObservableQuery objects corresponding 1:1 to TResult values
             * in the results arrays (both the `result` property and the resolved value).
             */
            queries: ObservableQuery<any>[];
            /**
             * An array of results that were either returned by `onQueryUpdated`, or provided by default in the absence of `onQueryUpdated`, including pending promises.
             *
             * If `onQueryUpdated` returns `false` for a given query, no result is provided for that query.
             *
             * If `onQueryUpdated` returns `true`, the resulting `Promise<ApolloQueryResult<any>>` is included in the `results` array instead of `true`.
             */
            results: InternalRefetchQueriesResult<TResult>[];
        }
    }
    export type SubscribeOptions<TData = unknown, TVariables extends OperationVariables = OperationVariables> = {
        /**
        * A GraphQL document, often created with `gql` from the `graphql-tag`
        * package, that contains a single subscription inside of it.
        */
        query: DocumentNode | TypedDocumentNode<TData, TVariables>;
        /**
        * How you want your component to interact with the Apollo cache. For details, see [Setting a fetch policy](https://www.apollographql.com/docs/react/data/queries/#setting-a-fetch-policy).
        */
        fetchPolicy?: FetchPolicy;
        /**
        * Specifies the `ErrorPolicy` to be used for this operation
        */
        errorPolicy?: ErrorPolicy;
        /**
        * Shared context between your component and your network interface (Apollo Link).
        */
        context?: DefaultContext;
        /**
        * Shared context between your component and your network interface (Apollo Link).
        */
        extensions?: Record<string, any>;
    } & VariablesOption<NoInfer<TVariables>>;
    export interface SubscribeResult<TData = unknown> {
        /**
        * The data returned from your mutation. Can be `undefined` if the `errorPolicy`
        * is `all` or `ignore` and the server returns a GraphQL response with `errors`
        * but not `data` or a network error is returned.
        */
        data: TData | undefined;
        /**
        * If the mutation produces one or more errors, this object contains either an array of `graphQLErrors` or a single `networkError`. Otherwise, this value is `undefined`.
        * 
        * For more information, see [Handling operation errors](https://www.apollographql.com/docs/react/data/error-handling/).
        */
        error?: ErrorLike;
        /**
        * Custom extensions returned from the GraphQL server
        */
        extensions?: Record<string, unknown>;
    }
    export type WatchFragmentOptions<TData = unknown, TVariables extends OperationVariables = OperationVariables> = ApolloCache.WatchFragmentOptions<TData, TVariables>;
    export type WatchFragmentResult<TData = unknown> = ApolloCache.WatchFragmentResult<MaybeMasked<TData>>;
    export interface ObservableFragment<TData = unknown> extends Observable<ApolloClient.WatchFragmentResult<TData>> {
        /**
         * Return the current result for the fragment.
         */
        getCurrentResult: () => ApolloClient.WatchFragmentResult<TData>;
    }
    /**
     * Watched query options.
     */
    export type WatchQueryOptions<TData = unknown, TVariables extends OperationVariables = OperationVariables> = {
        /**
        * Specifies how the query interacts with the Apollo Client cache during execution (for example, whether it checks the cache for results before sending a request to the server).
        * 
        * For details, see [Setting a fetch policy](https://www.apollographql.com/docs/react/data/queries/#setting-a-fetch-policy).
        * 
        * The default value is `cache-first`.
        * 
        * @docGroup 3. Caching options
        */
        fetchPolicy?: WatchQueryFetchPolicy;
        /**
        * Specifies the `FetchPolicy` to be used after this query has completed.
        * 
        * @docGroup 3. Caching options
        */
        nextFetchPolicy?: WatchQueryFetchPolicy | ((this: WatchQueryOptions<TData, TVariables>, currentFetchPolicy: WatchQueryFetchPolicy, context: NextFetchPolicyContext<TData, TVariables>) => WatchQueryFetchPolicy);
        /**
        * Defaults to the initial value of options.fetchPolicy, but can be explicitly
        * configured to specify the WatchQueryFetchPolicy to revert back to whenever
        * variables change (unless nextFetchPolicy intervenes).
        * 
        * @docGroup 3. Caching options
        */
        initialFetchPolicy?: WatchQueryFetchPolicy;
        /**
        * Specifies whether a `NetworkStatus.refetch` operation should merge
        * incoming field data with existing data, or overwrite the existing data.
        * Overwriting is probably preferable, but merging is currently the default
        * behavior, for backwards compatibility with Apollo Client 3.x.
        * 
        * @docGroup 3. Caching options
        */
        refetchWritePolicy?: RefetchWritePolicy;
        /**
        * Specifies how the query handles a response that returns both GraphQL errors and partial results.
        * 
        * For details, see [GraphQL error policies](https://www.apollographql.com/docs/react/data/error-handling/#graphql-error-policies).
        * 
        * The default value is `none`, meaning that the query result includes error details but not partial results.
        * 
        * @docGroup 1. Operation options
        */
        errorPolicy?: ErrorPolicy;
        /**
        * If you're using [Apollo Link](https://www.apollographql.com/docs/react/api/link/introduction/), this object is the initial value of the `context` object that's passed along your link chain.
        * 
        * @docGroup 2. Networking options
        */
        context?: DefaultContext;
        /**
        * Specifies the interval (in milliseconds) at which the query polls for updated results.
        * 
        * The default value is `0` (no polling).
        * 
        * @docGroup 2. Networking options
        */
        pollInterval?: number;
        /**
        * If `true`, the in-progress query's associated component re-renders whenever the network status changes or a network error occurs.
        * 
        * The default value is `true`.
        * 
        * @docGroup 2. Networking options
        */
        notifyOnNetworkStatusChange?: boolean;
        /**
        * If `true`, the query can return partial results from the cache if the cache doesn't contain results for all queried fields.
        * 
        * The default value is `false`.
        * 
        * @docGroup 3. Caching options
        */
        returnPartialData?: boolean;
        /**
        * A callback function that's called whenever a refetch attempt occurs
        * while polling. If the function returns `true`, the refetch is
        * skipped and not reattempted until the next poll interval.
        * 
        * @docGroup 2. Networking options
        */
        skipPollAttempt?: () => boolean;
        /**
        * A GraphQL query string parsed into an AST with the gql template literal.
        * 
        * @docGroup 1. Operation options
        */
        query: DocumentNode | TypedDocumentNode<TData, TVariables>;
        /**
        * Determines whether events trigger refetches for the query. Provide an
        * object mapping each refetch event to `true` (enable), `false` (disable)
        * or a callback function that returns `true`/`false` to control individual
        * events. Provide `false` to disable all automatic refetch events for this
        * query. Provide `true` to enable all automatic refetch events for this query.
        * Provide a callback function to perform additional logic to determine
        * whether to enable or disable a refetch for a query.
        * 
        * `@remarks`
        * `refetchOn` inherits from `defaultOptions.watchQuery.refetchOn`. If
        * `defaultOptions.watchQuery.refetchOn` is not set, all refetch events are
        * enabled by default.
        * 
        * This option only has an effect when the client is configured with a
        * `refetchEventManager`.
        * @docGroup 1. Operation options
        */
        refetchOn?: RefetchOn.Option;
        /**
        * @internal This API is meant for framework integrations only.
        * Do not use for everyday use.
        *
        * Indicates that the variables are unknown at the time of query creation.
        * This option can only be set when `fetchPolicy` is `'standby'`.
        * Setting this to `true` will prevent `client.refetchQueries` from refetching
        * this query before it has left the `'standby'` state, either by setting a
        * `fetchPolicy`, or by calling `observableQuery.refetch()` explicitly.
        *
        * Changing this option after the query has been created will have no effect.
        * 
        * @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
        */
        [variablesUnknownSymbol]?: boolean;
    } & VariablesOption<NoInfer<TVariables>>;
    namespace Base {
        interface ReadQueryOptions<TData, TVariables extends OperationVariables> {
            /**
             * The GraphQL query shape to be used constructed using the `gql` template
             * string tag. The query will be used to determine the
             * shape of the data to be read.
             */
            query: DocumentNode | TypedDocumentNode<TData, TVariables>;
            /**
             * The root id to be used. Defaults to "ROOT_QUERY", which is the ID of the
             * root query object. This property makes `readQuery` capable of reading data
             * from any object in the cache.
             */
            id?: string;
            /**
             * Whether to return incomplete data rather than null.
             * @defaultValue false
             */
            returnPartialData?: boolean;
            /**
             * Whether to read from optimistic or non-optimistic cache data.
             * This option should be preferred over the `optimistic` parameter of the
             * `readQuery` method.
             * @defaultValue false
             */
            optimistic?: boolean;
        }
    }
    export type ReadQueryOptions<TData, TVariables extends OperationVariables> = Base.ReadQueryOptions<TData, TVariables> & VariablesOption<TVariables>;
    export namespace DocumentationTypes {
        interface ReadQueryOptions<TData, TVariables extends OperationVariables> extends Base.ReadQueryOptions<TData, TVariables> {
            /**
             * Any variables that the GraphQL query may depend on.
             */
            variables?: TVariables;
        }
    }
    namespace Base {
        interface ReadFragmentOptions<TData, TVariables extends OperationVariables> {
            /**
             * A GraphQL document created using the `gql` template string tag
             * with one or more fragments which will be used to determine
             * the shape of data to read. If you provide more than one fragment in this
             * document then you must also specify `fragmentName` to specify which
             * fragment is the root fragment.
             */
            fragment: DocumentNode | TypedDocumentNode<TData, TVariables>;
            /**
             * The name of the fragment in your GraphQL document to be used. If you do
             * not provide a `fragmentName` and there is only one fragment in your
             * `fragment` document then that fragment will be used.
             */
            fragmentName?: string;
            /**
             * Whether to return incomplete data rather than null.
             * @defaultValue false
             */
            returnPartialData?: boolean;
            /**
             * Whether to read from optimistic or non-optimistic cache data.
             * This option should be preferred over the `optimistic` parameter of the
             * `readFragment` method.
             * @defaultValue false
             */
            optimistic?: boolean;
        }
    }
    export namespace DocumentationTypes {
        interface ReadFragmentOptions<TData, TVariables extends OperationVariables> extends Base.ReadFragmentOptions<TData, TVariables> {
            /**
             * The root id to be used. This id should take the same form as the
             * value returned by the `cache.identify` function. If a value with your
             * id does not exist in the store, `null` will be returned.
             */
            id?: string;
            /**
             * An object containing a `__typename` and primary key fields
             * (such as `id`) identifying the entity object from which the fragment will
             * be retrieved, or a `{ __ref: "..." }` reference, or a `string` ID
             * (uncommon).
             *
             * @remarks
             * `from` is given precedence over `id` when both are provided.
             */
            from?: ApolloCache.FromOptionValue<TData>;
        }
    }
    export type ReadFragmentOptions<TData, TVariables extends OperationVariables> = Base.ReadFragmentOptions<TData, TVariables> & VariablesOption<TVariables> & Cache.CacheIdentifierOption<TData>;
    export namespace DocumentationTypes {
        interface WriteQueryOptions<TData, TVariables extends OperationVariables> extends Base.WriteQueryOptions<TData, TVariables> {
            /**
             * Any variables that your GraphQL fragments depend on.
             */
            variables?: TVariables;
        }
    }
    namespace Base {
        interface WriteQueryOptions<TData, TVariables extends OperationVariables> {
            /**
             * The GraphQL query shape to be used constructed using the `gql` template
             * string tag. The query will be used to determine the
             * shape of the data to be read.
             */
            query: DocumentNode | TypedDocumentNode<TData, TVariables>;
            /**
             * The root id to be used. Defaults to "ROOT_QUERY", which is the ID of the
             * root query object. This property makes writeQuery capable of writing data
             * to any object in the cache.
             */
            id?: string;
            /**
             * The data to write to the store.
             */
            data: Unmasked<TData>;
            /**
             * Whether to notify query watchers.
             * @defaultValue true
             */
            broadcast?: boolean;
            /**
             * When true, ignore existing field data rather than merging it with
             * incoming data.
             * @defaultValue false
             */
            overwrite?: boolean;
            /**
             * GraphQL extensions for the write operation. Any provided `extensions`
             * are available in `merge` functions.
             */
            extensions?: Record<string, unknown>;
        }
    }
    export type WriteQueryOptions<TData, TVariables extends OperationVariables> = Base.WriteQueryOptions<TData, TVariables> & VariablesOption<TVariables>;
    export namespace DocumentationTypes {
        interface WriteQueryOptions<TData, TVariables extends OperationVariables> extends Base.WriteQueryOptions<TData, TVariables> {
            /**
             * Any variables that the GraphQL query may depend on.
             */
            variables?: TVariables;
        }
    }
    namespace Base {
        interface WriteFragmentOptions<TData, TVariables extends OperationVariables> {
            /**
             * A GraphQL document created using the `gql` template string tag from
             * `graphql-tag` with one or more fragments which will be used to determine
             * the shape of data to read. If you provide more than one fragment in this
             * document then you must also specify `fragmentName` to specify which
             * fragment is the root fragment.
             */
            fragment: DocumentNode | TypedDocumentNode<TData, TVariables>;
            /**
             * The name of the fragment in your GraphQL document to be used. If you do
             * not provide a `fragmentName` and there is only one fragment in your
             * `fragment` document then that fragment will be used.
             */
            fragmentName?: string;
            /**
             * The data to write to the store.
             */
            data: Unmasked<TData>;
            /**
             * Whether to notify query watchers.
             * @defaultValue true
             */
            broadcast?: boolean;
            /**
             * When true, ignore existing field data rather than merging it with
             * incoming data.
             * @defaultValue false
             */
            overwrite?: boolean;
        }
    }
    export type WriteFragmentOptions<TData, TVariables extends OperationVariables> = Base.WriteFragmentOptions<TData, TVariables> & VariablesOption<TVariables> & Cache.CacheIdentifierOption<TData>;
    export namespace DocumentationTypes {
        interface WriteFragmentOptions<TData, TVariables extends OperationVariables> extends Base.WriteFragmentOptions<TData, TVariables> {
            /**
             * The root id to be used. This id should take the same form as the
             * value returned by the `cache.identify` function. If a value with your
             * id does not exist in the store, `null` will be returned.
             */
            id?: string;
            /**
             * An object containing a `__typename` and primary key fields
             * (such as `id`) identifying the entity object from which the fragment will
             * be retrieved, or a `{ __ref: "..." }` reference, or a `string` ID
             * (uncommon).
             *
             * @remarks
             * `from` is given precedence over `id` when both are provided.
             */
            from?: ApolloCache.FromOptionValue<TData>;
            /**
             * Any variables that your GraphQL fragments depend on.
             */
            variables?: TVariables;
        }
    }
    export interface Experiment {
        (this: ApolloClient, options: ApolloClient.Options): void;
        v: 1;
    }
    export namespace DocumentationTypes {
        /**
         * This resolves a single query according to the options specified and
         * returns a `Promise` which is either resolved with the resulting data
         * or rejected with an error.
         *
         * @param options - An object of type `QueryOptions` that allows us to
         * describe how this query should be treated e.g. whether it should hit the
         * server at all or just resolve from the cache, etc.
         */
        function query<TData = unknown, TVariables extends OperationVariables = OperationVariables>(options: ApolloClient.QueryOptions<TData, TVariables>): Promise<ApolloClient.QueryResult<MaybeMasked<TData>>>;
        /**
         * This resolves a single mutation according to the options specified and returns a
         * Promise which is either resolved with the resulting data or rejected with an
         * error. In some cases both `data` and `errors` might be undefined, for example
         * when `errorPolicy` is set to `'ignore'`.
         *
         * It takes options as an object with the following keys and values:
         */
        function mutate<TData = unknown, TVariables extends OperationVariables = OperationVariables, TCache extends ApolloCache = ApolloCache>(options: ApolloClient.MutateOptions<TData, TVariables, TCache>): Promise<ApolloClient.MutateResult<MaybeMasked<TData>>>;
    }
}
/**
 * This is the primary Apollo Client class. It is used to send GraphQL documents (i.e. queries
 * and mutations) to a GraphQL spec-compliant server over an `ApolloLink` instance,
 * receive results from the server and cache the results in a store. It also delivers updates
 * to GraphQL queries through `Observable` instances.
 */
export declare class ApolloClient {
    link: ApolloLink;
    cache: ApolloCache;
    /**
     * @deprecated `disableNetworkFetches` has been renamed to `prioritizeCacheValues`.
     */
    disableNetworkFetches: never;
    set prioritizeCacheValues(value: boolean);
    /**
     * Whether to prioritize cache values over network results when `query` or `watchQuery` is called.
     * This will essentially turn a `"network-only"` or `"cache-and-network"` fetchPolicy into a `"cache-first"` fetchPolicy,
     * but without influencing the `fetchPolicy` of the created `ObservableQuery` long-term.
     *
     * This can e.g. be used to prioritize the cache during the first render after SSR.
     */
    get prioritizeCacheValues(): boolean;
    version: string;
    queryDeduplication: boolean;
    defaultOptions: ApolloClient.DefaultOptions;
    readonly devtoolsConfig: ApolloClient.DevtoolsOptions;
    readonly refetchEventManager: RefetchEventManager | undefined;
    private queryManager;
    private devToolsHookCb?;
    private resetStoreCallbacks;
    private clearStoreCallbacks;
    /**
     * Constructs an instance of `ApolloClient`.
     *
     * @example
     *
     * ```js
     * import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";
     *
     * const cache = new InMemoryCache();
     * const link = new HttpLink({ uri: "http://localhost:4000/" });
     *
     * const client = new ApolloClient({
     *   // Provide required constructor fields
     *   cache: cache,
     *   link: link,
     *
     *   // Provide some optional constructor fields
     *   clientAwareness: {
     *     name: "react-web-client",
     *     version: "1.3",
     *   },
     *   queryDeduplication: false,
     * });
     * ```
     */
    constructor(options: ApolloClient.Options);
    private connectToDevTools;
    /**
     * The `DocumentTransform` used to modify GraphQL documents before a request
     * is made. If a custom `DocumentTransform` is not provided, this will be the
     * default document transform.
     */
    get documentTransform(): DocumentTransform;
    /**
     * The configured `LocalState` instance used to enable the use of `@client`
     * fields.
     */
    get localState(): LocalState | undefined;
    set localState(localState: LocalState);
    /**
     * Call this method to terminate any active client processes, making it safe
     * to dispose of this `ApolloClient` instance.
     *
     * This method performs aggressive cleanup to prevent memory leaks:
     *
     * - Unsubscribes all active `ObservableQuery` instances by emitting a `completed` event
     * - Rejects all currently running queries with "QueryManager stopped while query was in flight"
     * - Removes all queryRefs from the suspense cache
     * - Disconnects the `RefetchEventManager` if configured.
     */
    stop(): void;
    /**
     * This watches the cache store of the query according to the options specified and
     * returns an `ObservableQuery`. We can subscribe to this `ObservableQuery` and
     * receive updated results through an observer when the cache store changes.
     *
     * Note that this method is not an implementation of GraphQL subscriptions. Rather,
     * it uses Apollo's store in order to reactively deliver updates to your query results.
     *
     * For example, suppose you call watchQuery on a GraphQL query that fetches a person's
     * first and last name and this person has a particular object identifier, provided by
     * `cache.identify`. Later, a different query fetches that same person's
     * first and last name and the first name has now changed. Then, any observers associated
     * with the results of the first query will be updated with a new result object.
     *
     * Note that if the cache does not change, the subscriber will _not_ be notified.
     *
     * See [here](https://medium.com/apollo-stack/the-concepts-of-graphql-bc68bd819be3#.3mb0cbcmc) for
     * a description of store reactivity.
     */
    watchQuery<TData = unknown, TVariables extends OperationVariables = OperationVariables>(options: ApolloClient.WatchQueryOptions<TData, TVariables>): ObservableQuery<TData, TVariables>;
    /**
    * This resolves a single query according to the options specified and
    * returns a `Promise` which is either resolved with the resulting data
    * or rejected with an error.
    * 
    * @param options - An object of type `QueryOptions` that allows us to
    * describe how this query should be treated e.g. whether it should hit the
    * server at all or just resolve from the cache, etc.
    */
    query: ApolloClient.query.Signature;
    /**
    * This resolves a single mutation according to the options specified and returns a
    * Promise which is either resolved with the resulting data or rejected with an
    * error. In some cases both `data` and `errors` might be undefined, for example
    * when `errorPolicy` is set to `'ignore'`.
    * 
    * It takes options as an object with the following keys and values:
    */
    mutate: ApolloClient.mutate.Signature;
    /**
     * This subscribes to a graphql subscription according to the options specified and returns an
     * `Observable` which either emits received data or an error.
     */
    subscribe<TData = unknown, TVariables extends OperationVariables = OperationVariables>(options: ApolloClient.SubscribeOptions<TData, TVariables>): SubscriptionObservable<ApolloClient.SubscribeResult<MaybeMasked<TData>>>;
    /**
     * Tries to read some data from the store in the shape of the provided
     * GraphQL query without making a network request. This method will start at
     * the root query. To start at a specific id returned by `cache.identify`
     * use `readFragment`.
     *
     * @param optimistic - Set to `true` to allow `readQuery` to return
     * optimistic results. Is `false` by default.
     */
    readQuery<TData = unknown, TVariables extends OperationVariables = OperationVariables>(options: ApolloClient.ReadQueryOptions<TData, TVariables>): Unmasked<TData> | null;
    /**
    * Tries to read some data from the store in the shape of the provided
    * GraphQL query without making a network request. This method will start at
    * the root query. To start at a specific id returned by `cache.identify`
    * use `readFragment`.
    * 
    * @param optimistic - Set to `true` to allow `readQuery` to return
    * optimistic results. Is `false` by default.
    *      
    *
    * @deprecated Pass the `optimistic` argument as part of the first argument
    * instead of passing it as a separate option.
    */
    readQuery<TData = unknown, TVariables extends OperationVariables = OperationVariables>(options: ApolloClient.ReadQueryOptions<TData, TVariables>, 
    /**
     * @deprecated Pass the `optimistic` argument as part of the first argument
     * instead of passing it as a separate option.
     */
    optimistic: boolean): Unmasked<TData> | null;
    /**
     * Watches the cache store of the fragment according to the options specified
     * and returns an `Observable`. We can subscribe to this
     * `Observable` and receive updated results through an
     * observer when the cache store changes.
     *
     * You must pass in a GraphQL document with a single fragment or a document
     * with multiple fragments that represent what you are reading. If you pass
     * in a document with multiple fragments then you must also specify a
     * `fragmentName`.
     *
     * @since 3.10.0
     * @param options - An object of type `WatchFragmentOptions` that allows
     * the cache to identify the fragment and optionally specify whether to react
     * to optimistic updates.
     */
    watchFragment<TData = unknown, TVariables extends OperationVariables = OperationVariables>(options: ApolloClient.WatchFragmentOptions<TData, TVariables> & {
        from: Array<ApolloCache.FromOptionValue<TData>>;
    }): ApolloClient.ObservableFragment<Array<TData>>;
    /**
    * Watches the cache store of the fragment according to the options specified
    * and returns an `Observable`. We can subscribe to this
    * `Observable` and receive updated results through an
    * observer when the cache store changes.
    * 
    * You must pass in a GraphQL document with a single fragment or a document
    * with multiple fragments that represent what you are reading. If you pass
    * in a document with multiple fragments then you must also specify a
    * `fragmentName`.
    * 
    * @since 3.10.0
    * @param options - An object of type `WatchFragmentOptions` that allows
    * the cache to identify the fragment and optionally specify whether to react
    * to optimistic updates.
    */
    watchFragment<TData = unknown, TVariables extends OperationVariables = OperationVariables>(options: ApolloClient.WatchFragmentOptions<TData, TVariables> & {
        from: Array<null>;
    }): ApolloClient.ObservableFragment<Array<null>>;
    watchFragment<TData = unknown, TVariables extends OperationVariables = OperationVariables>(options: ApolloClient.WatchFragmentOptions<TData, TVariables> & {
        from: Array<ApolloCache.FromOptionValue<TData> | null>;
    }): ApolloClient.ObservableFragment<Array<TData | null>>;
    /**
    * Watches the cache store of the fragment according to the options specified
    * and returns an `Observable`. We can subscribe to this
    * `Observable` and receive updated results through an
    * observer when the cache store changes.
    * 
    * You must pass in a GraphQL document with a single fragment or a document
    * with multiple fragments that represent what you are reading. If you pass
    * in a document with multiple fragments then you must also specify a
    * `fragmentName`.
    * 
    * @since 3.10.0
    * @param options - An object of type `WatchFragmentOptions` that allows
    * the cache to identify the fragment and optionally specify whether to react
    * to optimistic updates.
    */
    watchFragment<TData = unknown, TVariables extends OperationVariables = OperationVariables>(options: ApolloClient.WatchFragmentOptions<TData, TVariables> & {
        from: null;
    }): ApolloClient.ObservableFragment<null>;
    /**
    * Watches the cache store of the fragment according to the options specified
    * and returns an `Observable`. We can subscribe to this
    * `Observable` and receive updated results through an
    * observer when the cache store changes.
    * 
    * You must pass in a GraphQL document with a single fragment or a document
    * with multiple fragments that represent what you are reading. If you pass
    * in a document with multiple fragments then you must also specify a
    * `fragmentName`.
    * 
    * @since 3.10.0
    * @param options - An object of type `WatchFragmentOptions` that allows
    * the cache to identify the fragment and optionally specify whether to react
    * to optimistic updates.
    */
    watchFragment<TData = unknown, TVariables extends OperationVariables = OperationVariables>(options: ApolloClient.WatchFragmentOptions<TData, TVariables> & {
        from: ApolloCache.FromOptionValue<TData>;
    }): ApolloClient.ObservableFragment<TData>;
    /**
    * Watches the cache store of the fragment according to the options specified
    * and returns an `Observable`. We can subscribe to this
    * `Observable` and receive updated results through an
    * observer when the cache store changes.
    * 
    * You must pass in a GraphQL document with a single fragment or a document
    * with multiple fragments that represent what you are reading. If you pass
    * in a document with multiple fragments then you must also specify a
    * `fragmentName`.
    * 
    * @since 3.10.0
    * @param options - An object of type `WatchFragmentOptions` that allows
    * the cache to identify the fragment and optionally specify whether to react
    * to optimistic updates.
    */
    watchFragment<TData = unknown, TVariables extends OperationVariables = OperationVariables>(options: ApolloClient.WatchFragmentOptions<TData, TVariables>): ApolloClient.ObservableFragment<TData | null>;
    /**
     * Tries to read some data from the store in the shape of the provided
     * GraphQL fragment without making a network request. This method will read a
     * GraphQL fragment from any arbitrary id that is currently cached, unlike
     * `readQuery` which will only read from the root query.
     *
     * You must pass in a GraphQL document with a single fragment or a document
     * with multiple fragments that represent what you are reading. If you pass
     * in a document with multiple fragments then you must also specify a
     * `fragmentName`.
     *
     * @param optimistic - Set to `true` to allow `readFragment` to return
     * optimistic results. Is `false` by default.
     */
    readFragment<TData = unknown, TVariables extends OperationVariables = OperationVariables>(options: ApolloClient.ReadFragmentOptions<TData, TVariables>): Unmasked<TData> | null;
    /**
    * Tries to read some data from the store in the shape of the provided
    * GraphQL fragment without making a network request. This method will read a
    * GraphQL fragment from any arbitrary id that is currently cached, unlike
    * `readQuery` which will only read from the root query.
    * 
    * You must pass in a GraphQL document with a single fragment or a document
    * with multiple fragments that represent what you are reading. If you pass
    * in a document with multiple fragments then you must also specify a
    * `fragmentName`.
    * 
    * @param optimistic - Set to `true` to allow `readFragment` to return
    * optimistic results. Is `false` by default.
    *      
    *
    * @deprecated Pass the `optimistic` argument as part of the first argument
    * instead of passing it as a separate option.
    */
    readFragment<TData = unknown, TVariables extends OperationVariables = OperationVariables>(options: ApolloClient.ReadFragmentOptions<TData, TVariables>, optimistic: boolean): Unmasked<TData> | null;
    /**
     * Writes some data in the shape of the provided GraphQL query directly to
     * the store. This method will start at the root query. To start at a
     * specific id returned by `cache.identify` then use `writeFragment`.
     */
    writeQuery<TData = unknown, TVariables extends OperationVariables = OperationVariables>(options: ApolloClient.WriteQueryOptions<TData, TVariables>): Reference | undefined;
    /**
     * Writes some data in the shape of the provided GraphQL fragment directly to
     * the store. This method will write to a GraphQL fragment from any arbitrary
     * id that is currently cached, unlike `writeQuery` which will only write
     * from the root query.
     *
     * You must pass in a GraphQL document with a single fragment or a document
     * with multiple fragments that represent what you are writing. If you pass
     * in a document with multiple fragments then you must also specify a
     * `fragmentName`.
     */
    writeFragment<TData = unknown, TVariables extends OperationVariables = OperationVariables>(options: ApolloClient.WriteFragmentOptions<TData, TVariables>): Reference | undefined;
    __actionHookForDevTools(cb: () => any): void;
    __requestRaw(request: ApolloLink.Request): Observable<ApolloLink.Result<unknown>>;
    /**
     * Resets your entire store by clearing out your cache and then re-executing
     * all of your active queries. This makes it so that you may guarantee that
     * there is no data left in your store from a time before you called this
     * method.
     *
     * `resetStore()` is useful when your user just logged out. You’ve removed the
     * user session, and you now want to make sure that any references to data you
     * might have fetched while the user session was active is gone.
     *
     * It is important to remember that `resetStore()` _will_ refetch any active
     * queries. This means that any components that might be mounted will execute
     * their queries again using your network interface. If you do not want to
     * re-execute any queries then you should make sure to stop watching any
     * active queries.
     */
    resetStore(): Promise<ApolloClient.QueryResult<any>[] | null>;
    /**
     * Remove all data from the store. Unlike `resetStore`, `clearStore` will
     * not refetch any active queries.
     */
    clearStore(): Promise<any[]>;
    /**
     * Allows callbacks to be registered that are executed when the store is
     * reset. `onResetStore` returns an unsubscribe function that can be used
     * to remove registered callbacks.
     */
    onResetStore(cb: () => Promise<any>): () => void;
    /**
     * Allows callbacks to be registered that are executed when the store is
     * cleared. `onClearStore` returns an unsubscribe function that can be used
     * to remove registered callbacks.
     */
    onClearStore(cb: () => Promise<any>): () => void;
    /**
     * Refetches all of your active queries.
     *
     * `reFetchObservableQueries()` is useful if you want to bring the client back to proper state in case of a network outage
     *
     * It is important to remember that `reFetchObservableQueries()` _will_ refetch any active
     * queries. This means that any components that might be mounted will execute
     * their queries again using your network interface. If you do not want to
     * re-execute any queries then you should make sure to stop watching any
     * active queries.
     * Takes optional parameter `includeStandby` which will include queries in standby-mode when refetching.
     *
     * Note: `cache-only` queries are not refetched by this function.
     *
     * @deprecated Please use `refetchObservableQueries` instead.
     */
    reFetchObservableQueries: (includeStandby?: boolean) => Promise<ApolloClient.QueryResult<any>[]>;
    /**
     * Refetches all of your active queries.
     *
     * `refetchObservableQueries()` is useful if you want to bring the client back to proper state in case of a network outage
     *
     * It is important to remember that `refetchObservableQueries()` _will_ refetch any active
     * queries. This means that any components that might be mounted will execute
     * their queries again using your network interface. If you do not want to
     * re-execute any queries then you should make sure to stop watching any
     * active queries.
     * Takes optional parameter `includeStandby` which will include queries in standby-mode when refetching.
     *
     * Note: `cache-only` queries are not refetched by this function.
     */
    refetchObservableQueries(includeStandby?: boolean): Promise<ApolloClient.QueryResult<any>[]>;
    /**
     * Refetches specified active queries. Similar to "refetchObservableQueries()" but with a specific list of queries.
     *
     * `refetchQueries()` is useful for use cases to imperatively refresh a selection of queries.
     *
     * It is important to remember that `refetchQueries()` _will_ refetch specified active
     * queries. This means that any components that might be mounted will execute
     * their queries again using your network interface. If you do not want to
     * re-execute any queries then you should make sure to stop watching any
     * active queries.
     */
    refetchQueries<TCache extends ApolloCache = ApolloCache, TResult = Promise<ApolloClient.QueryResult<any>>>(options: ApolloClient.RefetchQueriesOptions<TCache, TResult>): ApolloClient.RefetchQueriesResult<TResult>;
    /**
     * Get all currently active `ObservableQuery` objects, in a `Set`.
     *
     * An "active" query is one that has observers and a `fetchPolicy` other than
     * "standby" or "cache-only".
     *
     * You can include all `ObservableQuery` objects (including the inactive ones)
     * by passing "all" instead of "active", or you can include just a subset of
     * active queries by passing an array of query names or DocumentNode objects.
     *
     * Note: This method only returns queries that have active subscribers. Queries
     * without subscribers are not tracked by the client.
     */
    getObservableQueries(include?: RefetchQueriesInclude): Set<ObservableQuery<any>>;
    /**
     * Exposes the cache's complete state, in a serializable format for later restoration.
     *
     * @remarks
     *
     * This can be useful for debugging in order to inspect the full state of the
     * cache.
     *
     * @param optimistic - Determines whether the result contains data from the
     * optimistic layer
     */
    extract(optimistic?: boolean): unknown;
    /**
     * Replaces existing state in the cache (if any) with the values expressed by
     * `serializedState`.
     *
     * Called when hydrating a cache (server side rendering, or offline storage),
     * and also (potentially) during hot reloads.
     */
    restore(serializedState: unknown): ApolloCache;
    /**
     * Define a new ApolloLink (or link chain) that Apollo Client will use.
     */
    setLink(newLink: ApolloLink): void;
    get defaultContext(): Partial<DefaultContext>;
    private maskedFragmentTransform;
    private transform;
    /**
     * @experimental
     * This is not a stable API - it is used in development builds to expose
     * information to the DevTools.
     * Use at your own risk!
     * For more details, see [Memory Management](https://www.apollographql.com/docs/react/caching/memory-management/#measuring-cache-usage)
     *
     * @example
     *
     * ```ts
     * console.log(client.getMemoryInternals());
     * ```
     *
     * Logs output in the following JSON format:
     * @example
     *
     * ```json
     * {
     *   "limits": {
     *     "canonicalStringify": 1000,
     *     "print": 2000,
     *     "documentTransform.cache": 2000,
     *     "queryManager.getDocumentInfo": 2000,
     *     "PersistedQueryLink.persistedQueryHashes": 2000,
     *     "fragmentRegistry.transform": 2000,
     *     "fragmentRegistry.lookup": 1000,
     *     "fragmentRegistry.findFragmentSpreads": 4000,
     *     "cache.fragmentQueryDocuments": 1000,
     *     "removeTypenameFromVariables.getVariableDefinitions": 2000,
     *     "inMemoryCache.maybeBroadcastWatch": 5000,
     *     "inMemoryCache.executeSelectionSet": 10000,
     *     "inMemoryCache.executeSubSelectedArray": 5000
     *   },
     *   "sizes": {
     *     "canonicalStringify": 4,
     *     "print": 14,
     *     "addTypenameDocumentTransform": [
     *       {
     *         "cache": 14
     *       }
     *     ],
     *     "queryManager": {
     *       "getDocumentInfo": 14,
     *       "documentTransforms": [
     *         {
     *           "cache": 14
     *         },
     *         {
     *           "cache": 14
     *         }
     *       ]
     *     },
     *     "fragmentRegistry": {
     *       "findFragmentSpreads": 34,
     *       "lookup": 20,
     *       "transform": 14
     *     },
     *     "cache": {
     *       "fragmentQueryDocuments": 22
     *     },
     *     "inMemoryCache": {
     *       "executeSelectionSet": 4345,
     *       "executeSubSelectedArray": 1206,
     *       "maybeBroadcastWatch": 32
     *     },
     *     "links": [
     *       {
     *         "PersistedQueryLink": {
     *           "persistedQueryHashes": 14
     *         }
     *       },
     *       {
     *         "removeTypenameFromVariables": {
     *           "getVariableDefinitions": 14
     *         }
     *       }
     *     ]
     *   }
     * }
     * ```
     */
    getMemoryInternals?: typeof getApolloClientMemoryInternals;
}
//# sourceMappingURL=ApolloClient.d.cts.map
