import type { DocumentNode } from "graphql";
import { Observable } from "rxjs";
import type { OperationVariables } from "@apollo/client";
import { ApolloLink } from "@apollo/client/link";
import type { Unmasked } from "@apollo/client/masking";
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
type CovariantUnaryFunction<out Arg, out Ret> = {
    fn(arg: Arg): Ret;
}["fn"];
type VariableMatcher<V = Record<string, any>> = CovariantUnaryFunction<V, boolean>;
export declare namespace MockLink {
    type DelayFunction = (operation: ApolloLink.Operation) => number;
    type Delay = number | DelayFunction;
    interface DefaultOptions {
        delay?: MockLink.Delay;
    }
    interface MockedRequest<TVariables extends OperationVariables = OperationVariables> {
        query: DocumentNode;
        variables?: TVariables | VariableMatcher<TVariables>;
    }
    interface MockedResponse<
    /* @ts-ignore */
    out TData = Record<string, any>, out TVariables extends OperationVariables = Record<string, any>> {
        request: MockedRequest<TVariables>;
        maxUsageCount?: number;
        result?: ApolloLink.Result<Unmasked<TData>> | ResultFunction<ApolloLink.Result<Unmasked<TData>>, TVariables>;
        error?: Error;
        delay?: number | MockLink.DelayFunction;
    }
    type ResultFunction<T, V = Record<string, any>> = CovariantUnaryFunction<V, T>;
    interface Options {
        showWarnings?: boolean;
        defaultOptions?: DefaultOptions;
    }
}
export declare function realisticDelay({ min, max, }?: {
    min?: number;
    max?: number;
}): MockLink.DelayFunction;
export declare class MockLink extends ApolloLink {
    operation: ApolloLink.Operation;
    showWarnings: boolean;
    private defaultDelay;
    private mockedResponsesByKey;
    static defaultOptions: MockLink.DefaultOptions;
    constructor(mockedResponses: ReadonlyArray<MockLink.MockedResponse<Record<string, any>, Record<string, any>>>, options?: MockLink.Options);
    addMockedResponse(mockedResponse: MockLink.MockedResponse): void;
    request(operation: ApolloLink.Operation): Observable<ApolloLink.Result>;
    private getMockedResponses;
    private normalizeMockedResponse;
}
/**
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
export declare function stringifyMockedResponse(mockedResponse: MockLink.MockedResponse): string;
export interface MockApolloLink extends ApolloLink {
    operation?: ApolloLink.Operation;
}
export {};
//# sourceMappingURL=mockLink.d.ts.map
