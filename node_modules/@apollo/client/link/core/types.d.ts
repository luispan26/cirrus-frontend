import type { FormattedExecutionResult, GraphQLFormattedError } from "graphql";
export interface ApolloPayloadResult<TData = Record<string, any>, TExtensions = Record<string, any>> {
    payload: FormattedExecutionResult<TData, TExtensions> | null;
    errors?: ReadonlyArray<GraphQLFormattedError>;
}
//# sourceMappingURL=types.d.ts.map