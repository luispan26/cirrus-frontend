import { ApolloLink } from "@apollo/client/link";
export declare namespace SetContextLink {
    namespace SetContextLinkDocumentationTypes {
        /**
         * A function that returns an updated context object for an Apollo Link
         * operation.
         *
         * The context setter function is called for each operation and allows you to
         * modify the operation's context before it's passed to the next link in the
         * chain. The returned context object is shallowly merged with the previous
         * context object.
         *
         * @param prevContext - The previous context of the operation (e.g. the value
         * of `operation.getContext()`)
         * @param operation - The GraphQL operation being executed, without the
         * `getContext` and `setContext` methods
         * @returns A partial context object or a promise that resolves to a partial context object
         */
        function ContextSetter(prevContext: Readonly<ApolloLink.OperationContext>, operation: SetContextLink.SetContextOperation): Promise<Partial<ApolloLink.OperationContext>> | Partial<ApolloLink.OperationContext>;
    }
    /**
    * A function that returns an updated context object for an Apollo Link
    * operation.
    * 
    * The context setter function is called for each operation and allows you to
    * modify the operation's context before it's passed to the next link in the
    * chain. The returned context object is shallowly merged with the previous
    * context object.
    * 
    * @param prevContext - The previous context of the operation (e.g. the value
    * of `operation.getContext()`)
    * @param operation - The GraphQL operation being executed, without the
    * `getContext` and `setContext` methods
    * @returns A partial context object or a promise that resolves to a partial context object
    */
    type ContextSetter = (prevContext: Readonly<ApolloLink.OperationContext>, operation: SetContextLink.SetContextOperation) => Promise<Partial<ApolloLink.OperationContext>> | Partial<ApolloLink.OperationContext>;
    /**
     * @deprecated
     * Use `ContextSetter` instead. This type is used by the deprecated
     * `setContext` function.
     */
    type LegacyContextSetter = (operation: SetContextLink.SetContextOperation, prevContext: Readonly<ApolloLink.OperationContext>) => Promise<Partial<ApolloLink.OperationContext>> | Partial<ApolloLink.OperationContext>;
    /**
     * An `ApolloLink.Operation` object without the `getContext` and `setContext`
     * methods. This prevents context setters from directly manipulating the
     * context during the setter function execution.
     */
    type SetContextOperation = Omit<ApolloLink.Operation, "getContext" | "setContext">;
}
/**
 * @deprecated
 * Use `SetContextLink` from `@apollo/client/link/context` instead. Note you
 * will need to flip the arguments when using `SetContextLink` as `prevContext`
 * is the first argument.
 *
 * ```ts
 * new SetContextLink((prevContext, operation) => {
 *   // ...
 * });
 * ```
 */
export declare function setContext(setter: SetContextLink.LegacyContextSetter): SetContextLink;
/**
 * `SetContextLink` is a non-terminating link that allows you to modify the
 * context of GraphQL operations before they're passed to the next link in the
 * chain. This is commonly used for authentication, adding headers, and other
 * request-time configuration.
 *
 * @example
 *
 * ```ts
 * import { SetContextLink } from "@apollo/client/link/context";
 *
 * const link = new SetContextLink((prevContext, operation) => {
 *   return {
 *     credentials: "include",
 *     // ...
 *   };
 * });
 * ```
 */
export declare class SetContextLink extends ApolloLink {
    constructor(setter: SetContextLink.ContextSetter);
}
//# sourceMappingURL=index.d.cts.map
