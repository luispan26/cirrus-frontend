import { Observable } from "rxjs";
import type { ApolloLink } from "@apollo/client/link";
import type { BatchLink } from "./batchLink.js";
export interface BatchableRequest {
    operation: ApolloLink.Operation;
    forward: ApolloLink.ForwardFunction;
}
export declare class OperationBatcher {
    private batchesByKey;
    private scheduledBatchTimerByKey;
    private batchDebounce?;
    private batchInterval?;
    private batchMax;
    private batchHandler;
    private batchKey;
    constructor({ batchDebounce, batchInterval, batchMax, batchHandler, batchKey, }: {
        batchDebounce?: boolean;
        batchInterval?: number;
        batchMax?: number;
        batchHandler: BatchLink.BatchHandler;
        batchKey?: (operation: ApolloLink.Operation) => string;
    });
    enqueueRequest(request: BatchableRequest): Observable<ApolloLink.Result>;
    consumeQueue(key?: string): (Observable<ApolloLink.Result> | undefined)[] | undefined;
    private scheduleQueueConsumption;
}
//# sourceMappingURL=batching.d.ts.map