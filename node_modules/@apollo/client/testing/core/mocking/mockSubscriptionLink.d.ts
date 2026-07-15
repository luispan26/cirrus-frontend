import { Observable } from "rxjs";
import { ApolloLink } from "@apollo/client/link";
export declare namespace MockSubscriptionLink {
    interface Result {
        result?: ApolloLink.Result;
        error?: Error;
        delay?: number;
    }
}
export declare class MockSubscriptionLink extends ApolloLink {
    unsubscribers: any[];
    setups: any[];
    operation?: ApolloLink.Operation;
    private observers;
    constructor();
    request(operation: ApolloLink.Operation): Observable<import("graphql").FormattedExecutionResult<Record<string, any>, Record<string, any>>>;
    simulateResult(result: MockSubscriptionLink.Result, complete?: boolean): void;
    simulateComplete(): void;
    onSetup(listener: any): void;
    onUnsubscribe(listener: any): void;
}
//# sourceMappingURL=mockSubscriptionLink.d.ts.map