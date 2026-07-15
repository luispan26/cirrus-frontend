/**
 * This file documents exports that have been removed from Apollo Client in 4.0.
 *
 * Executing the `removals` codemod will point removed exports to this file, where
 * docblocks will explain the removal and suggest alternatives.
 */
/**
* @deprecated All higher-order components (HOCs) have been removed from Apollo Client 4.0 and are no longer available.
* Use the hooks exported from the `@apollo/client/react` package instead.
*/
export declare const ApolloConsumer: never;
/**
* @deprecated The export `ApolloError` has been removed from Apollo Client 4.0.
* 
* Error handling has been overhauled as a whole.
*/
export declare class ApolloError {
}
/**
* @deprecated The export `Concast` has been removed from Apollo Client 4.0.
* 
* The Observable implementation of Apollo Client has been moved from `zen-observable` to `rxjs`.
*      
*
* Instead of `Concast`, look into the `rxjs` [`BehaviorSubject`](https://rxjs.dev/api/index/class/BehaviorSubject) api.
*/
export declare class Concast {
}
/**
* @deprecated The export `DataProxy` has been removed from Apollo Client 4.0.
*      
*
* You can find the types that were previously available in the `DataProxy` namespace either in the `ApolloClient` namespace or the `Cache` namespace.
*/
export declare const DataProxy: never;
/**
 * @deprecated The `DocumentType` enum has been removed from Apollo Client 4.0, along with the `parser` API exported from `@apollo/client/react/parser`.
 *
 * This API was mostly an implementation detail and has been removed without replacement.
 */
export declare const DocumentType: never;
/**
* @deprecated All render prop components have been removed from Apollo Client 4.0 and are no longer available.
* Use the hooks exported from the `@apollo/client/react` package instead.
*/
export declare const Mutation: never;
/**
* @deprecated The export `ObservableSubscription` has been removed from Apollo Client 4.0.
* 
* The Observable implementation of Apollo Client has been moved from `zen-observable` to `rxjs`.
*/
export declare const ObservableSubscription: never;
/**
* @deprecated The export `Observer` has been removed from Apollo Client 4.0.
* 
* The Observable implementation of Apollo Client has been moved from `zen-observable` to `rxjs`.
*/
export declare const Observer: never;
/**
* @deprecated The export `OperationBatcher` has been removed from Apollo Client 4.0.
* 
* This export was an implementation detail of `BatchLink` and is no longer available.
*/
export declare const OperationBatcher: never;
/**
* @deprecated All render prop components have been removed from Apollo Client 4.0 and are no longer available.
* Use the hooks exported from the `@apollo/client/react` package instead.
*/
export declare const Query: never;
/**
* @deprecated The export `RenderPromises` has been removed from Apollo Client 4.0.
* 
* This export was an implementation detail of `getMarkupFromTree` and is no longer available.
*/
export declare const RenderPromises: never;
/**
* @deprecated The export `Subscription` has been removed from Apollo Client 4.0.
* 
* The Observable implementation of Apollo Client has been moved from `zen-observable` to `rxjs`.
*/
export declare const Subscription: never;
/**
* @deprecated The export `addNonReactiveToNamedFragments` has been removed from Apollo Client 4.0.
* 
* This export was an implementation detail of the internal `QueryManager` class and is no longer available.
*/
export declare const addNonReactiveToNamedFragments: never;
/**
* @deprecated The export `asyncMap` has been removed from Apollo Client 4.0.
* 
* The Observable implementation of Apollo Client has been moved from `zen-observable` to `rxjs`.
*      
*
* Consider using the `rxjs` [`mergeMap`](https://rxjs.dev/api/operators/mergeMap) operator instead.
*/
export declare const asyncMap: never;
/**
* @deprecated The utility `buildQueryFromSelectionSet` has been removed from Apollo Client 4.0.
* 
* It was an implementation detail that is no longer necessary and has been removed without replacement.
*/
export declare const buildQueryFromSelectionSet: never;
/**
* @deprecated The utility `canUseAsyncIteratorSymbol` has been removed from Apollo Client 4.0.
* 
* It was an implementation detail that is no longer necessary and has been removed without replacement.
*/
export declare const canUseAsyncIteratorSymbol: never;
/**
* @deprecated The utility `canUseLayoutEffect` has been removed from Apollo Client 4.0.
* 
* It was an implementation detail that is no longer necessary and has been removed without replacement.
*/
export declare const canUseLayoutEffect: never;
/**
* @deprecated The utility `canUseSymbol` has been removed from Apollo Client 4.0.
* 
* It was an implementation detail that is no longer necessary and has been removed without replacement.
*/
export declare const canUseSymbol: never;
/**
* @deprecated The utility `canUseWeakMap` has been removed from Apollo Client 4.0.
* 
* It was an implementation detail that is no longer necessary and has been removed without replacement.
*/
export declare const canUseWeakMap: never;
/**
* @deprecated The utility `canUseWeakSet` has been removed from Apollo Client 4.0.
* 
* It was an implementation detail that is no longer necessary and has been removed without replacement.
*/
export declare const canUseWeakSet: never;
/**
* @deprecated The export `createMockClient` has been removed from Apollo Client 4.0.
*      
*
* Please create an `ApolloClient` instance with a `MockLink` manually instead.
*/
export declare const createMockClient: never;
/**
* @deprecated The export `createSchemaFetch` has been removed from Apollo Client 4.0.
* 
* The testing utilities have moved into their own package, [\@apollo/graphql-testing-library](https://github.com/apollographql/graphql-testing-library).
*/
export declare const createSchemaFetch: never;
/**
* @deprecated The export `createTestSchema` has been removed from Apollo Client 4.0.
* 
* The testing utilities have moved into their own package, [\@apollo/graphql-testing-library](https://github.com/apollographql/graphql-testing-library).
*/
export declare const createTestSchema: never;
/**
* @deprecated The export `defaultCacheSizes` has been removed from Apollo Client 4.0.
* 
* This export is considered internal and is no longer exposed.
*/
export declare const defaultCacheSizes: never;
/**
* @deprecated The export `fixObservableSubclass` has been removed from Apollo Client 4.0.
* 
* This export was an implementation detail of ObservableQuery and is no longer available.
*/
export declare const fixObservableSubclass: never;
/**
* @deprecated The export `fromError` has been removed from Apollo Client 4.0.
* 
* The Observable implementation of Apollo Client has been moved from `zen-observable` to `rxjs`.
*/
export declare const fromError: never;
/**
* @deprecated The export `fromPromise` has been removed from Apollo Client 4.0.
* 
* The Observable implementation of Apollo Client has been moved from `zen-observable` to `rxjs`.
*/
export declare const fromPromise: never;
/**
* @deprecated The utility `getDirectiveNames` has been removed from Apollo Client 4.0.
* 
* It was an implementation detail that is no longer necessary and has been removed without replacement.
*/
export declare const getDirectiveNames: never;
/**
* @deprecated The export `getFragmentMaskMode` has been removed from Apollo Client 4.0.
* 
* This export was an implementation detail of data masking and is no longer available.
*/
export declare const getFragmentMaskMode: never;
/**
* @deprecated The export `getInclusionDirectives` has been removed from Apollo Client 4.0.
* 
* This export was an implementation detail of local state and is no longer available.
*/
export declare const getInclusionDirectives: never;
/**
* @deprecated The export `getTypenameFromResult` has been removed from Apollo Client 4.0.
* 
* This export was an implementation detail of `InMemoryCache` and is no longer available.
*/
export declare const getTypenameFromResult: never;
/**
* @deprecated All higher-order components (HOCs) have been removed from Apollo Client 4.0 and are no longer available.
* Use the hooks exported from the `@apollo/client/react` package instead.
*/
export declare const graphql: never;
/**
* @deprecated The utility `hasAllDirectives` has been removed from Apollo Client 4.0.
* 
* It was an implementation detail that is no longer necessary and has been removed without replacement.
*/
export declare const hasAllDirectives: never;
/**
* @deprecated The utility `hasAnyDirectives` has been removed from Apollo Client 4.0.
* 
* It was an implementation detail that is no longer necessary and has been removed without replacement.
*/
export declare const hasAnyDirectives: never;
/**
* @deprecated The utility `hasClientExports` has been removed from Apollo Client 4.0.
* 
* It was an implementation detail that is no longer necessary and has been removed without replacement.
*/
export declare const hasClientExports: never;
/**
* @deprecated The export `isApolloError` has been removed from Apollo Client 4.0.
* 
* Error handling has been overhauled as a whole.
*/
export declare const isApolloError: never;
/**
* @deprecated The export `isApolloPayloadResult` has been removed from Apollo Client 4.0.
* 
* This export was an implementation detail of HttpLink and is no longer available.
*/
export declare const isApolloPayloadResult: never;
/**
* @deprecated The export `isExecutionPatchIncrementalResult` has been removed from Apollo Client 4.0.
* 
* This export was part of a specific `\@defer` protocol implementation.
* These implementations are now pluggable, so this export might not be relevant for all protocol specifications.
*/
export declare const isExecutionPatchIncrementalResult: never;
/**
* @deprecated The export `isExecutionPatchInitialResult` has been removed from Apollo Client 4.0.
* 
* This export was part of a specific `\@defer` protocol implementation.
* These implementations are now pluggable, so this export might not be relevant for all protocol specifications.
*/
export declare const isExecutionPatchInitialResult: never;
/**
* @deprecated The export `isExecutionPatchResult` has been removed from Apollo Client 4.0.
* 
* This export was part of a specific `\@defer` protocol implementation.
* These implementations are now pluggable, so this export might not be relevant for all protocol specifications.
*/
export declare const isExecutionPatchResult: never;
/**
* @deprecated The export `isFullyUnmaskedOperation` has been removed from Apollo Client 4.0.
* 
* This export was an implementation detail of data masking and is no longer available.
*/
export declare const isFullyUnmaskedOperation: never;
/**
* @deprecated The utility `isInlineFragment` has been removed from Apollo Client 4.0.
* 
* It was an implementation detail that is no longer necessary and has been removed without replacement.
*/
export declare const isInlineFragment: never;
/**
* @deprecated The utility `isStatefulPromise` has been removed from Apollo Client 4.0.
* 
* It was an implementation detail that is no longer necessary and has been removed without replacement.
*/
export declare const isStatefulPromise: never;
/**
* @deprecated The export `itAsync` has been removed from Apollo Client 4.0.
* 
* This was an internal testing utility that was not meant for public use.
* It has been removed without replacement.
*/
export declare const itAsync: never;
/**
* @deprecated The export `iterateObserversSafely` has been removed from Apollo Client 4.0.
* 
* This was an internal testing utility that was not meant for public use.
* It has been removed without replacement.
*/
export declare const iterateObserversSafely: never;
/**
* @deprecated The export `mergeIncrementalData` has been removed from Apollo Client 4.0.
* 
* This export was part of a specific `\@defer` protocol implementation.
* These implementations are now pluggable, so this export might not be relevant for all protocol specifications.
*/
export declare const mergeIncrementalData: never;
/**
* @deprecated The export `mockObservableLink` has been removed from Apollo Client 4.0.
*/
export declare const mockObservableLink: never;
/**
* @deprecated The export `mockSingleLink` has been removed from Apollo Client 4.0.
*      
*
* This utility was a wrapper around `MockLink`.
* Please call `new MockLink(mockedResponses)` directly.
*/
export declare const mockSingleLink: never;
/**
 * @deprecated The `operationName` function has been removed from Apollo Client 4.0, along with the `parser` API exported from `@apollo/client/react/parser`.
 *
 * This API was mostly an implementation detail and has been removed without replacement.
 */
export declare const operationName: never;
/**
 * @deprecated The `parser` function has been removed from Apollo Client 4.0, along with the whole `@apollo/client/react/parser` entry point.
 *
 * This API was mostly an implementation detail and has been removed without replacement.
 */
export declare const parser: never;
/**
* @deprecated The utility `removeArgumentsFromDocument` has been removed from Apollo Client 4.0.
* 
* It was an implementation detail that is no longer necessary and has been removed without replacement.
*/
export declare const removeArgumentsFromDocument: never;
/**
* @deprecated The utility `removeClientSetsFromDocument` has been removed from Apollo Client 4.0.
* 
* It was an implementation detail that is no longer necessary and has been removed without replacement.
*/
export declare const removeClientSetsFromDocument: never;
/**
* @deprecated The utility `removeConnectionDirectiveFromDocument` has been removed from Apollo Client 4.0.
* 
* It was an implementation detail that is no longer necessary and has been removed without replacement.
*/
export declare const removeConnectionDirectiveFromDocument: never;
/**
* @deprecated The utility `removeFragmentSpreadFromDocument` has been removed from Apollo Client 4.0.
* 
* It was an implementation detail that is no longer necessary and has been removed without replacement.
*/
export declare const removeFragmentSpreadFromDocument: never;
/**
* @deprecated The export `resetApolloContext` has been removed from Apollo Client 4.0.
*      
*
* This function was deprecated and is no longer available.
*/
export declare const resetApolloContext: never;
/**
* @deprecated The export `serializeFetchParameter` has been removed from Apollo Client 4.0.
* 
* This export was an implementation detail of HttpLink and is no longer available.
*      
*
* Please use `JSON.stringify` instead.
*/
export declare const serializeFetchParameter: never;
/**
* @deprecated The export `subscribeAndCount` has been removed from Apollo Client 4.0.
* 
* This was an internal testing utility that was not meant for public use.
* It has been removed without replacement.
*/
export declare const subscribeAndCount: never;
/**
* @deprecated The export `throwServerError` has been removed from Apollo Client 4.0.
* 
* This export was an implementation detail of HttpLink and is no longer available.
*      
*
* Please instantiate a `ServerError` directly instead.
*/
export declare const throwServerError: never;
/**
* @deprecated The export `tick` has been removed from Apollo Client 4.0.
* 
* This was an internal testing utility that was not meant for public use.
* It has been removed without replacement.
*/
export declare const tick: never;
/**
* @deprecated The export `toPromise` has been removed from Apollo Client 4.0.
* 
* The Observable implementation of Apollo Client has been moved from `zen-observable` to `rxjs`.
*      
*
* Please use the `rxjs` [`firstValueFrom`](https://rxjs.dev/api/index/function/firstValueFrom) or [`lastValueFrom`](https://rxjs.dev/api/index/function/lastValueFrom) functions instead.
*/
export declare const toPromise: never;
/**
* @deprecated The export `transformOperation` has been removed from Apollo Client 4.0.
* 
* This export was an implementation detail of ApolloLink.execute and is no longer available.
*/
export declare const transformOperation: never;
/**
* @deprecated The export `validateOperation` has been removed from Apollo Client 4.0.
* 
* This export was an implementation detail of ApolloLink.execute and is no longer available.
*/
export declare const validateOperation: never;
/**
* @deprecated The export `valueToObjectRepresentation` has been removed from Apollo Client 4.0.
* 
* This export is considered internal and is no longer exposed.
*/
export declare const valueToObjectRepresentation: never;
/**
* @deprecated The export `verifyDocumentType` has been removed from Apollo Client 4.0.
* 
* This export is considered internal and is no longer exposed.
*/
export declare const verifyDocumentType: never;
/**
* @deprecated The export `wait` has been removed from Apollo Client 4.0.
* 
* This was an internal testing utility that was not meant for public use.
* It has been removed without replacement.
*/
export declare const wait: never;
/**
* @deprecated All higher-order components (HOCs) have been removed from Apollo Client 4.0 and are no longer available.
* Use the hooks exported from the `@apollo/client/react` package instead.
*/
export declare const withApollo: never;
/**
* @deprecated The export `withErrorSpy` has been removed from Apollo Client 4.0.
* 
* This was an internal testing utility that was not meant for public use.
* It has been removed without replacement.
*/
export declare const withErrorSpy: never;
/**
* @deprecated The export `withLogSpy` has been removed from Apollo Client 4.0.
* 
* This was an internal testing utility that was not meant for public use.
* It has been removed without replacement.
*/
export declare const withLogSpy: never;
/**
* @deprecated All higher-order components (HOCs) have been removed from Apollo Client 4.0 and are no longer available.
* Use the hooks exported from the `@apollo/client/react` package instead.
*/
export declare const withMutation: never;
/**
* @deprecated All higher-order components (HOCs) have been removed from Apollo Client 4.0 and are no longer available.
* Use the hooks exported from the `@apollo/client/react` package instead.
*/
export declare const withQuery: never;
/**
* @deprecated All higher-order components (HOCs) have been removed from Apollo Client 4.0 and are no longer available.
* Use the hooks exported from the `@apollo/client/react` package instead.
*/
export declare const withSubscription: never;
/**
* @deprecated The export `withWarningSpy` has been removed from Apollo Client 4.0.
* 
* This was an internal testing utility that was not meant for public use.
* It has been removed without replacement.
*/
export declare const withWarningSpy: never;
/**
* @deprecated All render prop components have been removed from Apollo Client 4.0 and are no longer available.
* Use the hooks exported from the `@apollo/client/react` package instead.
*/
export type ApolloConsumerProps = never;
/**
* @deprecated The export `ApolloErrorOptions` has been removed from Apollo Client 4.0.
* 
* Error handling has been overhauled as a whole.
*/
export type ApolloErrorOptions = never;
/**
* @deprecated The export `BaseMutationOptions` has been removed from Apollo Client 4.0.
*      
*
* Look into `ApolloClient.MutateOptions` or `useMutation.Options` instead.
*/
export type BaseMutationOptions = never;
/**
* @deprecated The export `BaseQueryOptions` has been removed from Apollo Client 4.0.
*      
*
* Look into `ApolloClient.QueryOptions` or `useQuery.Options` instead.
*/
export type BaseQueryOptions = never;
/**
* @deprecated The export `BatchableRequest` has been removed from Apollo Client 4.0.
*/
export type BatchableRequest = never;
/**
* @deprecated All higher-order components (HOCs) have been removed from Apollo Client 4.0 and are no longer available.
* Use the hooks exported from the `@apollo/client/react` package instead.
*/
export type ChildDataProps = never;
/**
* @deprecated All higher-order components (HOCs) have been removed from Apollo Client 4.0 and are no longer available.
* Use the hooks exported from the `@apollo/client/react` package instead.
*/
export type ChildMutateProps = never;
/**
* @deprecated All higher-order components (HOCs) have been removed from Apollo Client 4.0 and are no longer available.
* Use the hooks exported from the `@apollo/client/react` package instead.
*/
export type ChildProps = never;
/**
* @deprecated The export `ClientParseError` has been removed from Apollo Client 4.0.
* 
* Error handling has been overhauled as a whole.
*/
export type ClientParseError = never;
/**
* @deprecated The export `Masked` has been removed from Apollo Client 4.0.
*/
export type Masked = never;
/**
* @deprecated The export `MaskedDocumentNode` has been removed from Apollo Client 4.0.
*/
export type MaskedDocumentNode = never;
/**
* @deprecated The export `CommonOptions` has been removed from Apollo Client 4.0.
*/
export type CommonOptions = never;
/**
* @deprecated The export `ConcastSourcesArray` has been removed from Apollo Client 4.0.
*/
export type ConcastSourcesArray = never;
/**
* @deprecated The export `ConcastSourcesIterable` has been removed from Apollo Client 4.0.
*/
export type ConcastSourcesIterable = never;
/**
* @deprecated The export `DataProps` has been removed from Apollo Client 4.0.
*/
export type DataProps = never;
/**
* @deprecated All higher-order components (HOCs) have been removed from Apollo Client 4.0 and are no longer available.
* Use the hooks exported from the `@apollo/client/react` package instead.
*/
export type DataValue = never;
/**
* @deprecated The export `DirectiveInfo` has been removed from Apollo Client 4.0.
*/
export type DirectiveInfo = never;
/**
* @deprecated The export `Directives` has been removed from Apollo Client 4.0.
*/
export type Directives = never;
/**
* @deprecated The export `FetchMoreQueryOptions` has been removed from Apollo Client 4.0.
*      
*
* Look into `ObservableQuery.FetchMoreOptions` instead.
*/
export type FetchMoreQueryOptions = never;
/**
* @deprecated The export `FragmentMatcher` has been removed from Apollo Client 4.0.
*/
export type FragmentMatcher = never;
/**
* @deprecated The export `GetDirectiveConfig` has been removed from Apollo Client 4.0.
*/
export type GetDirectiveConfig = never;
/**
* @deprecated The export `GetFragmentSpreadConfig` has been removed from Apollo Client 4.0.
*/
export type GetFragmentSpreadConfig = never;
/**
* @deprecated The export `GetNodeConfig` has been removed from Apollo Client 4.0.
*/
export type GetNodeConfig = never;
/**
* @deprecated The export `GraphQLErrors` has been removed from Apollo Client 4.0.
* 
* Error handling has been overhauled as a whole.
*/
export type GraphQLErrors = never;
/**
* @deprecated The export `IDocumentDefinition` has been removed from Apollo Client 4.0.
*/
export type IDocumentDefinition = never;
/**
* @deprecated The export `InclusionDirectives` has been removed from Apollo Client 4.0.
*/
export type InclusionDirectives = never;
/**
* @deprecated The export `IsStrictlyAny` has been removed from Apollo Client 4.0.
* 
* This was an internal testing utility that was not meant for public use.
* It has been removed without replacement.
*/
export type IsStrictlyAny = never;
/**
* @deprecated The export `MethodKeys` has been removed from Apollo Client 4.0.
*/
export type MethodKeys = never;
/**
* @deprecated All higher-order components (HOCs) have been removed from Apollo Client 4.0 and are no longer available.
* Use the hooks exported from the `@apollo/client/react` package instead.
*/
export type MutateProps = never;
/**
* @deprecated All render prop components have been removed from Apollo Client 4.0 and are no longer available.
* Use the hooks exported from the `@apollo/client/react` package instead.
*/
export type MutationComponentOptions = never;
/**
* @deprecated The export `MutationDataOptions` has been removed from Apollo Client 4.0.
*      
*
* Look into `ApolloClient.MutateOptions` or `useMutation.Options` instead.
*/
export type MutationDataOptions = never;
/**
* @deprecated The export `MutationUpdaterFn` has been removed from Apollo Client 4.0.
*/
export type MutationUpdaterFn = never;
/**
* @deprecated The export `NetworkError` has been removed from Apollo Client 4.0.
* 
* Error handling has been overhauled as a whole.
*/
export type NetworkError = never;
/**
* @deprecated The export `ObservableQueryFields` has been removed from Apollo Client 4.0.
* 
* This export is considered internal and is no longer exposed.
*/
export type ObservableQueryFields = never;
/**
* @deprecated The export `OnlyRequiredProperties` has been removed from Apollo Client 4.0.
* 
* This export is considered internal and is no longer exposed.
*/
export type OnlyRequiredProperties = never;
/**
* @deprecated All higher-order components (HOCs) have been removed from Apollo Client 4.0 and are no longer available.
* Use the hooks exported from the `@apollo/client/react` package instead.
*/
export type OperationOption = never;
/**
* @deprecated All higher-order components (HOCs) have been removed from Apollo Client 4.0 and are no longer available.
* Use the hooks exported from the `@apollo/client/react` package instead.
*/
export type OptionProps = never;
/**
* @deprecated The export `PromiseWithState` has been removed from Apollo Client 4.0.
* 
* This export is considered internal and is no longer exposed.
*/
export type PromiseWithState = never;
/**
* @deprecated The export `PureQueryOptions` has been removed from Apollo Client 4.0.
*/
export type PureQueryOptions = never;
/**
* @deprecated All render prop components have been removed from Apollo Client 4.0 and are no longer available.
* Use the hooks exported from the `@apollo/client/react` package instead.
*/
export type QueryComponentOptions = never;
/**
* @deprecated All higher-order components (HOCs) have been removed from Apollo Client 4.0 and are no longer available.
* Use the hooks exported from the `@apollo/client/react` package instead.
*/
export type QueryControls = never;
/**
* @deprecated The export `QueryDataOptions` has been removed from Apollo Client 4.0.
* 
* This export was an implementation detail of `getMarkupFromTree` and is no longer available.
*/
export type QueryDataOptions = never;
/**
* @deprecated The export `QueryLazyOptions` has been removed from Apollo Client 4.0.
*/
export type QueryLazyOptions = never;
/**
* @deprecated The export `ReconcilerFunction` has been removed from Apollo Client 4.0.
* 
* This export is considered internal and is no longer exposed.
*/
export type ReconcilerFunction = never;
/**
* @deprecated The export `RefetchQueriesFunction` has been removed from Apollo Client 4.0.
*      
*
* Look into using `useMutation.Options['refetchQueries']` instead.
*/
export type RefetchQueriesFunction = never;
/**
* @deprecated The export `RemoveArgumentsConfig` has been removed from Apollo Client 4.0.
*/
export type RemoveArgumentsConfig = never;
/**
* @deprecated The export `RemoveDirectiveConfig` has been removed from Apollo Client 4.0.
*/
export type RemoveDirectiveConfig = never;
/**
* @deprecated The export `RemoveFragmentDefinitionConfig` has been removed from Apollo Client 4.0.
*/
export type RemoveFragmentDefinitionConfig = never;
/**
* @deprecated The export `RemoveFragmentSpreadConfig` has been removed from Apollo Client 4.0.
*/
export type RemoveFragmentSpreadConfig = never;
/**
* @deprecated The export `RemoveNodeConfig` has been removed from Apollo Client 4.0.
*/
export type RemoveNodeConfig = never;
/**
* @deprecated The export `RemoveVariableDefinitionConfig` has been removed from Apollo Client 4.0.
*/
export type RemoveVariableDefinitionConfig = never;
/**
* @deprecated The export `Resolver` has been removed from Apollo Client 4.0.
* 
* This export was an implementation detail of local state and is no longer available.
*/
export type Resolver = never;
/**
* @deprecated The export `Resolvers` has been removed from Apollo Client 4.0.
* 
* This export was an implementation detail of local state and is no longer available.
*/
export type Resolvers = never;
/**
* @deprecated All render prop components have been removed from Apollo Client 4.0 and are no longer available.
* Use the hooks exported from the `@apollo/client/react` package instead.
*/
export type SubscriptionComponentOptions = never;
/**
* @deprecated The export `SubscriptionCurrentObservable` has been removed from Apollo Client 4.0.
*/
export type SubscriptionCurrentObservable = never;
/**
* @deprecated The utility `TupleToIntersection` has been removed from Apollo Client 4.0.
* 
* It was an implementation detail that is no longer necessary and has been removed without replacement.
*/
export type TupleToIntersection = never;
/**
* @deprecated The utility `UnionToIntersection` has been removed from Apollo Client 4.0.
* 
* It was an implementation detail that is no longer necessary and has been removed without replacement.
*/
export type UnionToIntersection = never;
/**
* @deprecated The export `VariableValue` has been removed from Apollo Client 4.0.
*/
export type VariableValue = never;
/**
* @deprecated All higher-order components (HOCs) have been removed from Apollo Client 4.0 and are no longer available.
* Use the hooks exported from the `@apollo/client/react` package instead.
*/
export type WithApolloClient = never;
export declare namespace Removals {
    /**
     * @deprecated The export `{{name}}` has been removed from Apollo Client 4.0.
     */
    type removedValue = never;
    /**
     * @deprecated The export `{{name}}` has been removed from Apollo Client 4.0.
     */
    type removedType = never;
    /**
     * @deprecated All higher-order components (HOCs) have been removed from Apollo Client 4.0 and are no longer available.
     * Use the hooks exported from the `@apollo/client/react` package instead.
     */
    type HOC = never;
    /**
     * @deprecated All render prop components have been removed from Apollo Client 4.0 and are no longer available.
     * Use the hooks exported from the `@apollo/client/react` package instead.
     */
    type renderProp = never;
    /**
     * @deprecated The export `{{name}}` has been removed from Apollo Client 4.0.
     *
     * Error handling has been overhauled as a whole.
     */
    type errors = never;
    /**
     * @deprecated The export `{{name}}` has been removed from Apollo Client 4.0.
     *
     * The Observable implementation of Apollo Client has been moved from `zen-observable` to `rxjs`.
     */
    type rxjs = never;
    /**
     * @deprecated The export `{{name}}` has been removed from Apollo Client 4.0.
     *
     * This export was an implementation detail of \{\{of\}\} and is no longer available.
     */
    type implementationDetail = never;
    /**
     * @deprecated The utility `{{name}}` has been removed from Apollo Client 4.0.
     *
     * It was an implementation detail that is no longer necessary and has been removed without replacement.
     */
    type utility = never;
    /**
     * @deprecated The export `{{name}}` has been removed from Apollo Client 4.0.
     *
     * The testing utilities have moved into their own package, [\@apollo/graphql-testing-library](https://github.com/apollographql/graphql-testing-library).
     */
    type testingLibrary = never;
    /**
     * @deprecated The export `{{name}}` has been removed from Apollo Client 4.0.
     *
     * This export is considered internal and is no longer exposed.
     */
    type internal = never;
    /**
     * @deprecated The export `{{name}}` has been removed from Apollo Client 4.0.
     *
     * This was an internal testing utility that was not meant for public use.
     * It has been removed without replacement.
     */
    type internalTesting = never;
    /**
     * @deprecated The export `{{name}}` has been removed from Apollo Client 4.0.
     *
     * This export was part of a specific `\@defer` protocol implementation.
     * These implementations are now pluggable, so this export might not be relevant for all protocol specifications.
     */
    type defer = never;
}
//# sourceMappingURL=v4-migration.d.cts.map
