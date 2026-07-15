import type { DocumentNode, FormattedExecutionResult, GraphQLFormattedError } from "graphql";
import type { ApolloLink } from "@apollo/client/link";
import type { DeepPartial, HKT } from "@apollo/client/utilities";
import type { Incremental } from "../types.js";
export declare namespace Defer20220824Handler {
    interface Defer20220824Result extends HKT {
        arg1: unknown;
        arg2: unknown;
        return: Defer20220824Handler.Chunk<Record<string, unknown>>;
    }
    interface TypeOverrides {
        AdditionalApolloLinkResultTypes: Defer20220824Result;
    }
    type InitialResult<TData = Record<string, unknown>> = {
        data?: TData | null | undefined;
        errors?: ReadonlyArray<GraphQLFormattedError>;
        extensions?: Record<string, unknown>;
        hasNext: boolean;
        incremental?: ReadonlyArray<IncrementalResult<TData>>;
    };
    type SubsequentResult<TData = Record<string, unknown>> = {
        extensions?: Record<string, unknown>;
        hasNext: boolean;
        incremental?: Array<IncrementalResult<TData>>;
    };
    type IncrementalDeferResult<TData = Record<string, unknown>> = {
        data?: TData | null;
        errors?: ReadonlyArray<GraphQLFormattedError>;
        extensions?: Record<string, unknown>;
        path?: Incremental.Path;
        label?: string;
    };
    type IncrementalStreamResult<TData = Array<unknown>> = {
        errors?: ReadonlyArray<GraphQLFormattedError>;
        items?: TData;
        path?: Incremental.Path;
        label?: string;
        extensions?: Record<string, unknown>;
    };
    type IncrementalResult<TData = Record<string, unknown>> = IncrementalDeferResult<TData> | IncrementalStreamResult<TData>;
    type Chunk<TData extends Record<string, unknown>> = InitialResult<TData> | SubsequentResult<TData>;
}
declare class DeferRequest<TData extends Record<string, unknown>> implements Incremental.IncrementalRequest<Defer20220824Handler.Chunk<TData>, TData> {
    hasNext: boolean;
    private errors;
    private extensions;
    private data;
    private ignoredImpossibleStreamPaths;
    private merge;
    handle(cacheData: TData | DeepPartial<TData> | null | undefined, chunk: Defer20220824Handler.Chunk<TData>): FormattedExecutionResult<TData>;
}
/**
 * This handler implements the `@defer` directive as specified in this historical commit:
 * https://github.com/graphql/graphql-spec/tree/48cf7263a71a683fab03d45d309fd42d8d9a6659/spec
 */
export declare class Defer20220824Handler implements Incremental.Handler<Defer20220824Handler.Chunk<any>> {
    isIncrementalResult(result: Record<string, any>): result is Defer20220824Handler.SubsequentResult | Defer20220824Handler.InitialResult;
    extractErrors(result: ApolloLink.Result<any>): GraphQLFormattedError[] | undefined;
    prepareRequest(request: ApolloLink.Request): ApolloLink.Request;
    startRequest<TData extends Record<string, unknown>>(_: {
        query: DocumentNode;
    }): DeferRequest<TData>;
}
export declare function hasIncrementalChunks(result: Record<string, any>): result is Required<Defer20220824Handler.SubsequentResult>;
export {};
//# sourceMappingURL=defer20220824.d.ts.map