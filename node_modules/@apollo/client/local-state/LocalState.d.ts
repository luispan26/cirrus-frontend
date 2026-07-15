import type { DocumentNode, FieldNode, FormattedExecutionResult } from "graphql";
import type { ApolloClient, DefaultContext, OperationVariables, TypedDocumentNode, WatchQueryFetchPolicy } from "@apollo/client";
import type { FragmentMap, NoInfer, RemoveIndexSignature } from "@apollo/client/utilities/internal";
type InferContextValueFromResolvers<TResolvers> = TResolvers extends {
    [typename: string]: infer TFieldResolvers;
} ? TFieldResolvers extends ({
    [field: string]: LocalState.Resolver<any, any, infer TContext, any>;
}) ? unknown extends TContext ? DefaultContext : TContext : DefaultContext : DefaultContext;
type MaybeRequireContextFunction<TContext> = {} extends RemoveIndexSignature<TContext> ? {} : {
    context: LocalState.ContextFunction<TContext>;
};
export declare namespace LocalState {
    /**
     * Configuration options for LocalState.
     *
     * @template TResolvers - The type of resolvers map to use for type checking
     * @template TContext - The type of context value returned by the context function. Defaults to `DefaultContext` when not provided.
     */
    type Options<TResolvers extends Resolvers = Resolvers, TContext = DefaultContext> = {
        context?: ContextFunction<TContext>;
        /**
         * The map of resolvers used to provide values for `@local` fields.
         */
        resolvers?: TResolvers;
    } & MaybeRequireContextFunction<TContext>;
    interface RootValueFunctionContext {
        document: DocumentNode;
        client: ApolloClient;
        context: DefaultContext;
        phase: "exports" | "resolve";
        variables: OperationVariables;
    }
    type ContextFunction<TContext> = (options: ContextFunctionOptions) => TContext;
    interface ContextFunctionOptions {
        document: DocumentNode;
        client: ApolloClient;
        phase: "exports" | "resolve";
        variables: OperationVariables;
        requestContext: DefaultContext;
    }
    type RootValueFunction<TRootValue> = (context: RootValueFunctionContext) => TRootValue;
    /**
     * A map of GraphQL types to their field resolvers.
     *
     * @example
     *
     * ```ts
     * const resolvers: Resolvers = {
     *   Query: {
     *     isLoggedIn: () => !!localStorage.getItem("token"),
     *   },
     *   Mutation: {
     *     login: (_, { token }) => {
     *       localStorage.setItem("token", token);
     *       return true;
     *     },
     *   },
     * };
     * ```
     */
    interface Resolvers<TContext = any> {
        [typename: string]: {
            [field: string]: Resolver<any, any, TContext, any>;
        };
    }
    /**
     * A function that resolves the value for a single GraphQL field marked with `@client`.
     *
     * Resolver functions receive four parameters:
     *
     * - `rootValue`: The parent object containing the result from the resolver on the parent field
     * - `args`: Arguments passed to the field
     * - `context`: Contains `requestContext`, `client`, and `phase` properties
     * - `info`: Information about the field being resolved
     *
     * @template TResult - The type of value returned by the resolver
     * @template TParent - The type of the parent object
     * @template TContext - The type of the request context
     * @template TArgs - The type of the field arguments
     *
     * @example
     *
     * ```ts
     * const isLoggedInResolver: Resolver<boolean> = () => {
     *   return !!localStorage.getItem("token");
     * };
     * ```
     */
    type Resolver<TResult = unknown, TParent = unknown, TContext = DefaultContext, TArgs = Record<string, unknown>> = (rootValue: TParent, args: TArgs, context: {
        requestContext: TContext;
        client: ApolloClient;
        phase: "exports" | "resolve";
    }, info: {
        field: FieldNode;
        fragmentMap: FragmentMap;
        path: Path;
    }) => TResult | Promise<TResult>;
    type Path = Array<string | number>;
}
/**
 * LocalState enables the use of `@client` fields in GraphQL operations.
 *
 * `@client` fields are resolved locally using resolver functions rather than
 * being sent to the GraphQL server. This allows you to mix local and remote
 * data in a single query.
 *
 * @example
 *
 * ```ts
 * import { LocalState } from "@apollo/client/local-state";
 *
 * const localState = new LocalState({
 *   resolvers: {
 *     Query: {
 *       isLoggedIn: () => !!localStorage.getItem("token"),
 *     },
 *   },
 * });
 *
 * const client = new ApolloClient({
 *   cache: new InMemoryCache(),
 *   localState,
 * });
 * ```
 *
 * @template TResolvers - The type of resolvers map for type checking
 * @template TContext - The type of context value for resolvers
 */
export declare class LocalState<TResolvers extends LocalState.Resolvers = LocalState.Resolvers<DefaultContext>, TContext = InferContextValueFromResolvers<TResolvers>> {
    private context?;
    private resolvers;
    private traverseCache;
    constructor(...[options]: {} extends TResolvers ? [
        options?: LocalState.Options<TResolvers, NoInfer<TContext>>
    ] : [
        options: LocalState.Options<TResolvers, NoInfer<TContext>> & {
            resolvers: TResolvers;
        }
    ]);
    /**
     * Add resolvers to the local state. New resolvers will be merged with
     * existing ones, with new resolvers taking precedence over existing ones
     * for the same field.
     *
     * @param resolvers - The resolvers to add
     *
     * @example
     *
     * ```ts
     * localState.addResolvers({
     *   Query: {
     *     newField: () => "Hello World",
     *   },
     * });
     * ```
     */
    addResolvers(resolvers: TResolvers): void;
    execute<TData = unknown, TVariables extends OperationVariables = OperationVariables>({ document, client, context, remoteResult, variables, onlyRunForcedResolvers, returnPartialData, fetchPolicy, }: {
        document: DocumentNode | TypedDocumentNode<TData, TVariables>;
        client: ApolloClient;
        context: DefaultContext | undefined;
        remoteResult: FormattedExecutionResult<any> | undefined;
        variables: TVariables | undefined;
        onlyRunForcedResolvers?: boolean;
        returnPartialData?: boolean;
        fetchPolicy: WatchQueryFetchPolicy;
    }): Promise<FormattedExecutionResult<TData>>;
    getExportedVariables<TVariables extends OperationVariables = OperationVariables>({ document, client, context, variables, }: {
        document: DocumentNode | TypedDocumentNode<any, TVariables>;
        client: ApolloClient;
        context: DefaultContext | undefined;
        variables: Partial<NoInfer<TVariables>>;
    }): Promise<TVariables>;
    private resolveSelectionSet;
    private resolveServerField;
    private resolveClientField;
    private addError;
    private getResolver;
    private resolveSubSelectedArray;
    private collectQueryDetail;
}
export {};
//# sourceMappingURL=LocalState.d.ts.map