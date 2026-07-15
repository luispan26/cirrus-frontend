import type { DocumentNode, FormattedExecutionResult, GraphQLFormattedError } from "graphql";
import type { ApolloLink } from "@apollo/client/link";
import type { DeepPartial, HKT } from "@apollo/client/utilities";
import type { Incremental } from "../types.cjs";
export declare namespace GraphQL17Alpha9Handler {
    interface GraphQL17Alpha9Result extends HKT {
        arg1: unknown;
        arg2: unknown;
        return: GraphQL17Alpha9Handler.Chunk<Record<string, unknown>>;
    }
    interface TypeOverrides {
        AdditionalApolloLinkResultTypes: GraphQL17Alpha9Result;
    }
    type InitialResult<TData = Record<string, unknown>> = {
        data: TData;
        errors?: ReadonlyArray<GraphQLFormattedError>;
        pending: ReadonlyArray<PendingResult>;
        hasNext: boolean;
        extensions?: Record<string, unknown>;
    };
    type SubsequentResult<TData = unknown> = {
        hasNext: boolean;
        pending?: ReadonlyArray<PendingResult>;
        incremental?: ReadonlyArray<IncrementalResult<TData>>;
        completed?: ReadonlyArray<CompletedResult>;
        extensions?: Record<string, unknown>;
    };
    interface PendingResult {
        id: string;
        path: Incremental.Path;
        label?: string;
    }
    interface CompletedResult {
        id: string;
        errors?: ReadonlyArray<GraphQLFormattedError>;
    }
    interface IncrementalDeferResult<TData = Record<string, unknown>> {
        errors?: ReadonlyArray<GraphQLFormattedError>;
        data: TData;
        id: string;
        subPath?: Incremental.Path;
        extensions?: Record<string, unknown>;
    }
    interface IncrementalStreamResult<TData = ReadonlyArray<unknown>> {
        errors?: ReadonlyArray<GraphQLFormattedError>;
        items: TData;
        id: string;
        subPath?: Incremental.Path;
        extensions?: Record<string, unknown>;
    }
    type IncrementalResult<TData = unknown> = IncrementalDeferResult<TData> | IncrementalStreamResult<TData>;
    type Chunk<TData> = InitialResult<TData> | SubsequentResult<TData>;
}
declare class IncrementalRequest<TData> implements Incremental.IncrementalRequest<GraphQL17Alpha9Handler.Chunk<TData>, TData> {
    hasNext: boolean;
    private data;
    private errors;
    private extensions;
    private pending;
    private streamInfo;
    private streamPositions;
    handle(cacheData: TData | DeepPartial<TData> | null | undefined, chunk: GraphQL17Alpha9Handler.Chunk<TData>): FormattedExecutionResult<TData>;
    private merge;
}
/**
 * Provides handling for the incremental delivery specification implemented by
 * graphql.js version `17.0.0-alpha.9`.
 */
export declare class GraphQL17Alpha9Handler implements Incremental.Handler<GraphQL17Alpha9Handler.Chunk<any>> {
    /**
    * @internal
    * 
    * @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
    */
    isIncrementalResult(result: ApolloLink.Result<any>): result is GraphQL17Alpha9Handler.InitialResult | GraphQL17Alpha9Handler.SubsequentResult;
    /**
    * @internal
    * 
    * @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
    */
    prepareRequest(request: ApolloLink.Request): ApolloLink.Request;
    /**
    * @internal
    * 
    * @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
    */
    extractErrors(result: ApolloLink.Result<any>): GraphQLFormattedError[] | undefined;
    /**
    * @internal
    * 
    * @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
    */
    startRequest<TData>(_: {
        query: DocumentNode;
    }): IncrementalRequest<TData>;
}
export {};
//# sourceMappingURL=graphql17Alpha9.d.cts.map
