import type { DocumentNode, FormattedExecutionResult } from "graphql";
import type { ApolloCache } from "@apollo/client/cache";
import type { ApolloLink } from "@apollo/client/link";
import type { Unmasked } from "@apollo/client/masking";
import type { ExtensionsWithStreamInfo } from "@apollo/client/utilities/internal";
import type { ApolloClient } from "./ApolloClient.cjs";
import type { ObservableQuery } from "./ObservableQuery.cjs";
import type { QueryManager } from "./QueryManager.cjs";
import type { DataValue, DefaultContext, InternalRefetchQueriesInclude, MutationUpdaterFunction, NormalizedExecutionResult, OnQueryUpdated, OperationVariables, TypedDocumentNode } from "./types.cjs";
import type { ErrorPolicy } from "./watchQueryOptions.cjs";
type UpdateQueries<TData> = ApolloClient.MutateOptions<TData, any, any>["updateQueries"];
export declare const enum CacheWriteBehavior {
    FORBID = 0,
    OVERWRITE = 1,
    MERGE = 2
}
interface LastWrite {
    result: FormattedExecutionResult<any, ExtensionsWithStreamInfo>;
    variables: ApolloClient.WatchQueryOptions["variables"];
    dmCount: number | undefined;
}
interface OperationInfo<TData, TVariables extends OperationVariables, AllowedCacheWriteBehavior = CacheWriteBehavior> {
    document: DocumentNode | TypedDocumentNode<TData, TVariables>;
    variables: TVariables;
    errorPolicy: ErrorPolicy;
    cacheWriteBehavior: AllowedCacheWriteBehavior;
}
export declare class QueryInfo<TData, TVariables extends OperationVariables = OperationVariables, TCache extends ApolloCache = ApolloCache> {
    lastRequestId: number;
    private cache;
    private queryManager;
    readonly id: string;
    private readonly observableQuery?;
    private incremental?;
    constructor(queryManager: QueryManager, observableQuery?: ObservableQuery<any, any>);
    /**
    * @internal
    * For feud-preventing behaviour, `lastWrite` should be shared by all `QueryInfo` instances of an `ObservableQuery`.
    * In the case of a standalone `QueryInfo`, we will keep a local version.
    * 
    * @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
    */
    _lastWrite?: LastWrite;
    private get lastWrite();
    private set lastWrite(value);
    resetLastWrite(): void;
    private shouldWrite;
    get hasNext(): boolean;
    private maybeHandleIncrementalResult;
    markQueryResult(incoming: ApolloLink.Result<TData>, { document: query, variables, errorPolicy, cacheWriteBehavior, }: OperationInfo<TData, TVariables>): FormattedExecutionResult<DataValue.Complete<TData> | DataValue.Streaming<TData>, ExtensionsWithStreamInfo>;
    markMutationResult(incoming: ApolloLink.Result<TData>, mutation: OperationInfo<TData, TVariables, CacheWriteBehavior.FORBID | CacheWriteBehavior.MERGE> & {
        context?: DefaultContext;
        updateQueries: UpdateQueries<TData>;
        update?: MutationUpdaterFunction<TData, TVariables, TCache>;
        awaitRefetchQueries?: boolean;
        refetchQueries?: ((result: NormalizedExecutionResult<Unmasked<TData>>) => InternalRefetchQueriesInclude) | InternalRefetchQueriesInclude;
        removeOptimistic?: string;
        onQueryUpdated?: OnQueryUpdated<any>;
        keepRootFields?: boolean;
    }, cache?: TCache): Promise<FormattedExecutionResult<DataValue.Complete<TData> | DataValue.Streaming<TData>, ExtensionsWithStreamInfo>>;
    markMutationOptimistic(optimisticResponse: any, mutation: OperationInfo<TData, TVariables, CacheWriteBehavior.FORBID | CacheWriteBehavior.MERGE> & {
        context?: DefaultContext;
        updateQueries: UpdateQueries<TData>;
        update?: MutationUpdaterFunction<TData, TVariables, TCache>;
        keepRootFields?: boolean;
    }): boolean;
    markSubscriptionResult(result: FormattedExecutionResult<TData>, { document, variables, errorPolicy, cacheWriteBehavior, }: OperationInfo<TData, TVariables, CacheWriteBehavior.FORBID | CacheWriteBehavior.MERGE>): void;
}
export {};
//# sourceMappingURL=QueryInfo.d.cts.map
