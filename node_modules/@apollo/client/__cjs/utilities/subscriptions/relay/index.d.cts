import type { GraphQLResponse, RequestParameters } from "relay-runtime";
import { Observable } from "relay-runtime";
import type { OperationVariables } from "@apollo/client";
type CreateMultipartSubscriptionOptions = {
    fetch?: WindowOrWorkerGlobalScope["fetch"];
    headers?: Record<string, string>;
};
export declare function createFetchMultipartSubscription(uri: string, { fetch: preferredFetch, headers }?: CreateMultipartSubscriptionOptions): (operation: RequestParameters, variables: OperationVariables) => Observable<GraphQLResponse>;
export {};
//# sourceMappingURL=index.d.cts.map
