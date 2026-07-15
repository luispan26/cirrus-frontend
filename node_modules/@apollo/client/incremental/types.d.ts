import type { DocumentNode, FormattedExecutionResult, GraphQLFormattedError } from "graphql";
import type { ApolloLink } from "@apollo/client/link";
import type { DeepPartial } from "@apollo/client/utilities";
export declare namespace Incremental {
    type Path = ReadonlyArray<string | number>;
    /**
    * @internal
    * 
    * @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
    */
    interface Handler<Chunk extends Record<string, unknown> = Record<string, unknown>> {
        isIncrementalResult: (result: ApolloLink.Result<any>) => result is Chunk;
        prepareRequest: (request: ApolloLink.Request) => ApolloLink.Request;
        extractErrors: (result: ApolloLink.Result<any>) => readonly GraphQLFormattedError[] | undefined | void;
        startRequest: <TData extends Record<string, unknown>>(request: {
            query: DocumentNode;
        }) => IncrementalRequest<Chunk, TData>;
    }
    interface IncrementalRequest<Chunk extends Record<string, unknown>, TData> {
        hasNext: boolean;
        handle: (cacheData: TData | DeepPartial<TData> | undefined | null, chunk: Chunk) => FormattedExecutionResult<TData>;
    }
    /**
    * @internal
    * 
    * @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
    */
    interface StreamFieldInfo {
        isFirstChunk: boolean;
        isLastChunk: boolean;
    }
}
//# sourceMappingURL=types.d.ts.map
