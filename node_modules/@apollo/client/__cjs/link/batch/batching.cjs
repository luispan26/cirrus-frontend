"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OperationBatcher = void 0;
const rxjs_1 = require("rxjs");
// QueryBatcher doesn't fire requests immediately. Requests that were enqueued within
// a certain amount of time (configurable through `batchInterval`) will be batched together
// into one query.
class OperationBatcher {
    // Queue on which the QueryBatcher will operate on a per-tick basis.
    batchesByKey = new Map();
    scheduledBatchTimerByKey = new Map();
    batchDebounce;
    batchInterval;
    batchMax;
    //This function is called to the queries in the queue to the server.
    batchHandler;
    batchKey;
    constructor({ batchDebounce, batchInterval, batchMax, batchHandler, batchKey, }) {
        this.batchDebounce = batchDebounce;
        this.batchInterval = batchInterval;
        this.batchMax = batchMax || 0;
        this.batchHandler = batchHandler;
        this.batchKey = batchKey || (() => "");
    }
    enqueueRequest(request) {
        const requestCopy = {
            ...request,
            next: [],
            error: [],
            complete: [],
            subscribers: new Set(),
        };
        const key = this.batchKey(request.operation);
        if (!requestCopy.observable) {
            requestCopy.observable = new rxjs_1.Observable((observer) => {
                let batch = this.batchesByKey.get(key);
                if (!batch)
                    this.batchesByKey.set(key, (batch = new Set()));
                // These booleans seem to me (@benjamn) like they might always be the
                // same (and thus we could do with only one of them), but I'm not 100%
                // sure about that.
                const isFirstEnqueuedRequest = batch.size === 0;
                const isFirstSubscriber = requestCopy.subscribers.size === 0;
                requestCopy.subscribers.add(observer);
                if (isFirstSubscriber) {
                    batch.add(requestCopy);
                }
                // called for each subscriber, so need to save all listeners (next, error, complete)
                if (observer.next) {
                    requestCopy.next.push(observer.next.bind(observer));
                }
                if (observer.error) {
                    requestCopy.error.push(observer.error.bind(observer));
                }
                if (observer.complete) {
                    requestCopy.complete.push(observer.complete.bind(observer));
                }
                // The first enqueued request triggers the queue consumption after `batchInterval` milliseconds.
                if (isFirstEnqueuedRequest || this.batchDebounce) {
                    this.scheduleQueueConsumption(key);
                }
                // When amount of requests reaches `batchMax`, trigger the queue consumption without waiting on the `batchInterval`.
                if (batch.size === this.batchMax) {
                    this.consumeQueue(key);
                }
                return () => {
                    // If this is last subscriber for this request, remove request from queue
                    if (requestCopy.subscribers.delete(observer) &&
                        requestCopy.subscribers.size < 1) {
                        // If this is last request from queue, remove queue entirely
                        if (batch.delete(requestCopy) && batch.size < 1) {
                            this.consumeQueue(key);
                            // If queue was in flight, cancel it
                            batch.subscription?.unsubscribe();
                        }
                    }
                };
            });
        }
        return requestCopy.observable;
    }
    // Consumes the queue.
    // Returns a list of promises (one for each query).
    consumeQueue(key = "") {
        const batch = this.batchesByKey.get(key);
        // Delete this batch and process it below.
        this.batchesByKey.delete(key);
        if (!batch || !batch.size) {
            // No requests to be processed.
            return;
        }
        const operations = [];
        const forwards = [];
        const observables = [];
        const nexts = [];
        const errors = [];
        const completes = [];
        // Even though batch is a Set, it preserves the order of first insertion
        // when iterating (per ECMAScript specification), so these requests will be
        // handled in the order they were enqueued (minus any deleted ones).
        batch.forEach((request) => {
            operations.push(request.operation);
            forwards.push(request.forward);
            observables.push(request.observable);
            nexts.push(request.next);
            errors.push(request.error);
            completes.push(request.complete);
        });
        const batchedObservable = this.batchHandler(operations, forwards);
        const onError = (error) => {
            //each callback list in batch
            errors.forEach((rejecters) => {
                if (rejecters) {
                    //each subscriber to request
                    rejecters.forEach((e) => e(error));
                }
            });
        };
        batch.subscription = batchedObservable.subscribe({
            next: (results) => {
                if (!Array.isArray(results)) {
                    results = [results];
                }
                if (nexts.length !== results.length) {
                    const error = new Error(`server returned results with length ${results.length}, expected length of ${nexts.length}`);
                    error.result = results;
                    return onError(error);
                }
                results.forEach((result, index) => {
                    if (nexts[index]) {
                        nexts[index].forEach((next) => next(result));
                    }
                });
            },
            error: onError,
            complete: () => {
                completes.forEach((complete) => {
                    if (complete) {
                        //each subscriber to request
                        complete.forEach((c) => c());
                    }
                });
            },
        });
        return observables;
    }
    scheduleQueueConsumption(key) {
        clearTimeout(this.scheduledBatchTimerByKey.get(key));
        this.scheduledBatchTimerByKey.set(key, setTimeout(() => {
            this.consumeQueue(key);
            this.scheduledBatchTimerByKey.delete(key);
        }, this.batchInterval));
    }
}
exports.OperationBatcher = OperationBatcher;
//# sourceMappingURL=batching.cjs.map
