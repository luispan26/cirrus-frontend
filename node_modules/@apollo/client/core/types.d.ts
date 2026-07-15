import type { DocumentNode, FormattedExecutionResult } from "graphql";
import type { NextNotification, Observable, ObservableNotification } from "rxjs";
import type { ApolloCache } from "@apollo/client/cache";
import type { Cache } from "@apollo/client/cache";
import type { ClientAwarenessLink } from "@apollo/client/link/client-awareness";
import type { Unmasked } from "@apollo/client/masking";
import type { DeepPartial, HKT } from "@apollo/client/utilities";
import type { ApplyHKTImplementationWithDefault, IsAny } from "@apollo/client/utilities/internal";
import type { ApolloClient } from "./ApolloClient.js";
import type { ObservableQuery } from "./ObservableQuery.js";
export type { TypedDocumentNode } from "@graphql-typed-document-node/core";
export interface TypeOverrides {
}
declare namespace OverridableTypes {
    interface Defaults {
        Complete: Complete;
        Streaming: Streaming;
        Partial: Partial;
    }
    interface Complete extends HKT {
        arg1: unknown;
        return: this["arg1"];
    }
    interface Streaming extends HKT {
        arg1: unknown;
        return: this["arg1"];
    }
    interface Partial extends HKT {
        arg1: unknown;
        return: DeepPartial<this["arg1"]>;
    }
}
export declare namespace DataValue {
    /**
     * Returns a representation of `TData` in it's "complete" state.
     *
     * @defaultValue `TData` if no overrides are provided.
     *
     * @example
     * You can override this type globally - this example shows how to override it
     * with `DeepPartial<TData>`:
     *
     * ```ts
     * import { HKT, DeepPartial } from "@apollo/client/utilities";
     *
     * type CompleteOverride<TData> =
     *   TData extends { _complete?: infer _Complete } ? _Complete : TData;
     *
     * interface CompleteOverrideHKT extends HKT {
     *   return: CompleteOverride<this["arg1"]>;
     * }
     *
     * declare module "@apollo/client" {
     *   export interface TypeOverrides {
     *     Complete: CompleteOverrideHKT;
     *   }
     * }
     * ```
     */
    type Complete<TData> = ApplyHKTImplementationWithDefault<TypeOverrides, "Complete", OverridableTypes.Defaults, TData>;
    /**
     * Returns a representation of `TData` while it is streaming.
     *
     * @defaultValue `TData` if no overrides are provided.
     *
     * @example
     * You can override this type globally - this example shows how to override it
     * with `DeepPartial<TData>`:
     *
     * ```ts
     * import { HKT, DeepPartial } from "@apollo/client/utilities";
     *
     * type StreamingOverride<TData> = DeepPartial<TData>;
     *
     * interface StreamingOverrideHKT extends HKT {
     *   return: StreamingOverride<this["arg1"]>;
     * }
     *
     * declare module "@apollo/client" {
     *   export interface TypeOverrides {
     *     Streaming: StreamingOverrideHKT;
     *   }
     * }
     * ```
     */
    type Streaming<TData> = ApplyHKTImplementationWithDefault<TypeOverrides, "Streaming", OverridableTypes.Defaults, TData>;
    /**
     * Returns a representation of `TData` while it is partial.
     *
     * @defaultValue `DeepPartial<TData>` if no overrides are provided.
     *
     * @example
     * You can override this type globally - this example shows how to override it
     * with `DeepPartial<TData>`:
     *
     * ```ts
     * import { HKT, DeepPartial } from "@apollo/client/utilities";
     *
     * type PartialOverride<TData> = DeepPartial<Complete<TData>>;
     *
     * interface PartialOverrideHKT extends HKT {
     *   return: PartialOverride<this["arg1"]>;
     * }
     *
     * declare module "@apollo/client" {
     *   export interface TypeOverrides {
     *     Partial: PartialOverrideHKT;
     *   }
     * }
     * ```
     */
    type Partial<TData> = ApplyHKTImplementationWithDefault<TypeOverrides, "Partial", OverridableTypes.Defaults, TData>;
}
export interface DefaultContext extends Record<string, any> {
    /**
     * Indicates whether `queryDeduplication` was enabled for the request.
     */
    queryDeduplication?: boolean;
    clientAwareness?: ClientAwarenessLink.ClientAwarenessOptions;
}
export interface RefetchEvents {
    windowFocus: Event;
    online: Event;
}
export declare namespace RefetchOn {
    type Context<TSource extends keyof RefetchEvents = keyof RefetchEvents> = TSource extends keyof RefetchEvents ? {
        /**
         * The source name that triggered the refetch.
         */
        source: TSource;
        /**
         * Any data emitted by the source along with the event
         */
        payload: RefetchEvents[TSource];
    } : never;
    type Callback<TSource extends keyof RefetchEvents = keyof RefetchEvents> = (context: RefetchOn.Context<TSource>) => boolean;
    type Option = boolean | RefetchOn.Callback<keyof RefetchEvents> | {
        [Key in keyof RefetchEvents]?: boolean | RefetchOn.Callback<Key>;
    };
}
/**
 * Represents an `Error` type, but used throughout Apollo Client to represent
 * errors that may otherwise fail `instanceof` checks if they are cross-realm
 * Error instances (see the [`Error.isError` proposal](https://github.com/tc39/proposal-is-error) for more details).
 *
 * Apollo Client uses several types of errors throughout the client which can be
 * narrowed using `instanceof`:
 *
 * - `CombinedGraphQLErrors` - `errors` returned from a GraphQL result
 * - `CombinedProtocolErrors` - Transport-level errors from multipart subscriptions.
 * - `ServerParseError` - A JSON-parse error when parsing the server response.
 * - `ServerError` - A non-200 server response.
 *
 * @example
 *
 * ```ts
 * import { CombinedGraphQLErrors } from "@apollo/client";
 *
 * try {
 *   await client.query({ query });
 * } catch (error) {
 *   // Use `instanceof` to check for more specific types of errors.
 *   if (error instanceof CombinedGraphQLErrors) {
 *     error.errors.map((graphQLError) => console.log(graphQLError.message));
 *   } else {
 *     console.error(errors);
 *   }
 * }
 * ```
 */
export interface ErrorLike {
    message: string;
    name: string;
    stack?: string;
}
export type OnQueryUpdated<TResult> = (observableQuery: ObservableQuery<any>, diff: Cache.DiffResult<any>, lastDiff: Cache.DiffResult<any> | undefined) => boolean | TResult;
export type RefetchQueryDescriptor = string | DocumentNode;
export type InternalRefetchQueryDescriptor = RefetchQueryDescriptor | ApolloClient.QueryOptions;
type RefetchQueriesIncludeShorthand = "all" | "active";
export type RefetchQueriesInclude = RefetchQueryDescriptor[] | RefetchQueriesIncludeShorthand;
export type InternalRefetchQueriesInclude = InternalRefetchQueryDescriptor[] | RefetchQueriesIncludeShorthand;
export type RefetchQueriesPromiseResults<TResult> = IsAny<TResult> extends true ? any[] : TResult extends boolean ? ApolloClient.QueryResult<any>[] : TResult extends PromiseLike<infer U> ? U[] : TResult[];
export interface InternalRefetchQueriesOptions<TCache extends ApolloCache, TResult> extends Omit<ApolloClient.RefetchQueriesOptions<TCache, TResult>, "include"> {
    include?: InternalRefetchQueriesInclude;
    removeOptimistic?: string;
}
export type InternalRefetchQueriesResult<TResult> = TResult extends boolean ? Promise<ApolloClient.QueryResult<any>> : TResult;
export type InternalRefetchQueriesMap<TResult> = Map<ObservableQuery<any>, InternalRefetchQueriesResult<TResult>>;
export type OperationVariables = Record<string, any>;
export type DataState<TData> = {
    /**
    * An object containing the result of your GraphQL query after it completes.
    * 
    * This value might be `undefined` if a query results in one or more errors (depending on the query's `errorPolicy`).
    * 
    * @docGroup 1. Operation data
    */
    data: DataValue.Complete<TData>;
    /**
    * Describes the completeness of `data`.
    * 
    * - `empty`: No data could be fulfilled from the cache or the result is
    *   incomplete. `data` is `undefined`.
    * - `partial`: Some data could be fulfilled from the cache but `data` is
    *   incomplete. This is only possible when `returnPartialData` is `true`.
    * - `streaming`: `data` is incomplete as a result of a deferred query and
    *   the result is still streaming in.
    * - `complete`: `data` is a fully satisfied query result fulfilled
    *   either from the cache or network.
    * 
    * @docGroup 1. Operation data
    */
    dataState: "complete";
} | {
    /**
    * An object containing the result of your GraphQL query after it completes.
    * 
    * This value might be `undefined` if a query results in one or more errors (depending on the query's `errorPolicy`).
    * 
    * @docGroup 1. Operation data
    */
    data: DataValue.Streaming<TData>;
    /**
    * Describes the completeness of `data`.
    * 
    * - `empty`: No data could be fulfilled from the cache or the result is
    *   incomplete. `data` is `undefined`.
    * - `partial`: Some data could be fulfilled from the cache but `data` is
    *   incomplete. This is only possible when `returnPartialData` is `true`.
    * - `streaming`: `data` is incomplete as a result of a deferred query and
    *   the result is still streaming in.
    * - `complete`: `data` is a fully satisfied query result fulfilled
    *   either from the cache or network.
    * 
    * @docGroup 1. Operation data
    */
    dataState: "streaming";
} | {
    /**
    * An object containing the result of your GraphQL query after it completes.
    * 
    * This value might be `undefined` if a query results in one or more errors (depending on the query's `errorPolicy`).
    * 
    * @docGroup 1. Operation data
    */
    data: DataValue.Partial<TData>;
    /**
    * Describes the completeness of `data`.
    * 
    * - `empty`: No data could be fulfilled from the cache or the result is
    *   incomplete. `data` is `undefined`.
    * - `partial`: Some data could be fulfilled from the cache but `data` is
    *   incomplete. This is only possible when `returnPartialData` is `true`.
    * - `streaming`: `data` is incomplete as a result of a deferred query and
    *   the result is still streaming in.
    * - `complete`: `data` is a fully satisfied query result fulfilled
    *   either from the cache or network.
    * 
    * @docGroup 1. Operation data
    */
    dataState: "partial";
} | {
    /**
    * An object containing the result of your GraphQL query after it completes.
    * 
    * This value might be `undefined` if a query results in one or more errors (depending on the query's `errorPolicy`).
    * 
    * @docGroup 1. Operation data
    */
    data: undefined;
    /**
    * Describes the completeness of `data`.
    * 
    * - `empty`: No data could be fulfilled from the cache or the result is
    *   incomplete. `data` is `undefined`.
    * - `partial`: Some data could be fulfilled from the cache but `data` is
    *   incomplete. This is only possible when `returnPartialData` is `true`.
    * - `streaming`: `data` is incomplete as a result of a deferred query and
    *   the result is still streaming in.
    * - `complete`: `data` is a fully satisfied query result fulfilled
    *   either from the cache or network.
    * 
    * @docGroup 1. Operation data
    */
    dataState: "empty";
};
export type GetDataState<TData, TState extends DataState<TData>["dataState"]> = Extract<DataState<TData>, {
    dataState: TState;
}>;
/**
 * Represents a result that might be complete or still streaming and
 * has been normalized into a plain GraphQL result. When the result is
 * still `streaming`, some fields might not yet be available.
 */
export type NormalizedExecutionResult<TData = Record<string, unknown>, TExtensions = Record<string, unknown>> = Omit<FormattedExecutionResult<TData, TExtensions>, "data"> & GetDataState<TData, "streaming" | "complete">;
export type MutationQueryReducer<T> = (previousResult: Record<string, any>, options: {
    mutationResult: NormalizedExecutionResult<Unmasked<T>>;
    queryName: string | undefined;
    queryVariables: Record<string, any>;
}) => Record<string, any>;
export type MutationQueryReducersMap<T = {
    [key: string]: any;
}> = {
    [queryName: string]: MutationQueryReducer<T>;
};
export type MutationUpdaterFunction<TData, TVariables extends OperationVariables, TCache extends ApolloCache> = (cache: TCache, result: FormattedExecutionResult<Unmasked<TData>>, options: {
    context?: DefaultContext;
    variables?: TVariables;
}) => void;
export declare namespace QueryNotification {
    type NewNetworkStatus = NextNotification<{
        resetError?: boolean;
    }> & {
        source: "newNetworkStatus";
    };
    type SetResult<TData> = NextNotification<ObservableQuery.Result<TData>> & {
        source: "setResult";
    };
    type FromNetwork<TData> = ObservableNotification<ObservableQuery.Result<TData>> & {
        source: "network";
    };
    type FromCache<TData> = NextNotification<ObservableQuery.Result<TData>> & {
        source: "cache";
    };
    type Value<TData> = FromCache<TData> | FromNetwork<TData> | NewNetworkStatus | SetResult<TData>;
}
/** Observable created by initiating a subscription operation. */
export interface SubscriptionObservable<T> extends Observable<T> {
    /**
     * Used to restart the connection to the link chain. Calling this on a
     * deduplicated subscription will restart the connection for all observables
     * that share the request.
     *
     * @example
     *
     * ```ts
     * const observable = client.subscribe({ query: subscription });
     * observable.subscribe((value) => {
     *   // ...
     * });
     *
     * observable.restart();
     * ```
     */
    restart: () => void;
}
//# sourceMappingURL=types.d.ts.map
