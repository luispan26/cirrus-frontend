import type { Observable, Observer, OperatorFunction, Subscription } from "rxjs";
import type { DataValue, ErrorLike, MaybeMasked, NetworkStatus, OperationVariables } from "@apollo/client";
/**
 * This namespace contains simplified interface versions of existing, complicated, types in Apollo Client.
 * These interfaces are used in the documentation to provide a more readable
 * and understandable API reference.
 */
export declare namespace DocumentationTypes {
    interface DataState<TData> {
        /**
        * An object containing the result of your GraphQL query after it completes.
        * 
        * This value might be `undefined` if a query results in one or more errors (depending on the query's `errorPolicy`).
        * 
        * @docGroup 1. Operation data
        */
        data?: DataValue.Complete<TData> | DataValue.Streaming<TData> | DataValue.Partial<TData> | undefined;
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
        dataState: "complete" | "streaming" | "partial" | "empty";
    }
    interface VariableOptions<TVariables extends OperationVariables> {
        /**
        * An object containing all of the GraphQL variables your query requires to execute.
        * 
        * Each key in the object corresponds to a variable name, and that key's value corresponds to the variable value.
        * 
        * @docGroup 1. Operation options
        */
        variables?: TVariables;
    }
    interface ApolloQueryResult<TData> extends DataState<TData> {
        /**
        * A single ErrorLike object describing the error that occurred during the latest
        * query execution.
        * 
        * For more information, see [Handling operation errors](https://www.apollographql.com/docs/react/data/error-handling/).
        * 
        * @docGroup 1. Operation data
        */
        error?: ErrorLike;
        /**
        * If `true`, the query is still in flight.
        * 
        * @docGroup 2. Network info
        */
        loading: boolean;
        /**
        * A number indicating the current network state of the query's associated request. [See possible values.](https://github.com/apollographql/apollo-client/blob/d96f4578f89b933c281bb775a39503f6cdb59ee8/src/core/networkStatus.ts#L4)
        * 
        * Used in conjunction with the [`notifyOnNetworkStatusChange`](#notifyonnetworkstatuschange) option.
        * 
        * @docGroup 2. Network info
        */
        networkStatus: NetworkStatus;
        /**
        * Describes whether `data` is a complete or partial result. This flag is only
        * set when `returnPartialData` is `true` in query options.
        * 
        * @deprecated This field will be removed in a future version of Apollo Client.
        * @docGroup 1. Operation data
        */
        partial: boolean;
    }
    interface RxjsObservable<TData> {
        pipe<OperatorResult>(...operators: [
            OperatorFunction<Observable<ApolloQueryResult<TData>>, OperatorResult>
        ] | [
            OperatorFunction<Observable<ApolloQueryResult<TData>>, unknown>,
            ...OperatorFunction<unknown, unknown>[],
            OperatorFunction<unknown, OperatorResult>
        ]): Observable<OperatorResult>;
        subscribe(observer: Partial<Observer<ApolloQueryResult<MaybeMasked<TData>>>> | ((value: ApolloQueryResult<MaybeMasked<TData>>) => void)): Subscription;
    }
}
//# sourceMappingURL=DocumentationTypes.d.ts.map
