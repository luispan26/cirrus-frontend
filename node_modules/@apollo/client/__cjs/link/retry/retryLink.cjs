"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetryLink = void 0;
const rxjs_1 = require("rxjs");
const errors_1 = require("@apollo/client/errors");
const link_1 = require("@apollo/client/link");
const delayFunction_js_1 = require("./delayFunction.cjs");
const retryFunction_js_1 = require("./retryFunction.cjs");
class RetryableOperation {
    observer;
    operation;
    forward;
    delayFor;
    retryIf;
    retryCount = 0;
    currentSubscription = null;
    timerId;
    constructor(observer, operation, forward, delayFor, retryIf) {
        this.observer = observer;
        this.operation = operation;
        this.forward = forward;
        this.delayFor = delayFor;
        this.retryIf = retryIf;
        this.try();
    }
    /**
     * Stop retrying for the operation, and cancel any in-progress requests.
     */
    cancel() {
        if (this.currentSubscription) {
            this.currentSubscription.unsubscribe();
        }
        clearTimeout(this.timerId);
        this.timerId = undefined;
        this.currentSubscription = null;
    }
    try() {
        this.currentSubscription = this.forward(this.operation).subscribe({
            next: (result) => {
                if ((0, errors_1.graphQLResultHasProtocolErrors)(result)) {
                    this.onError(result.extensions[errors_1.PROTOCOL_ERRORS_SYMBOL], () => 
                    // Pretend like we never encountered this error and move the result
                    // along for Apollo Client core to handle this error.
                    this.observer.next(result));
                    // Unsubscribe from the current subscription to prevent the `complete`
                    // handler to be called as a result of the stream closing.
                    this.currentSubscription?.unsubscribe();
                    return;
                }
                this.observer.next(result);
            },
            error: (error) => this.onError(error, () => this.observer.error(error)),
            complete: this.observer.complete.bind(this.observer),
        });
    }
    onError = async (error, onContinue) => {
        this.retryCount += 1;
        const errorLike = (0, errors_1.toErrorLike)(error);
        const shouldRetry = await this.retryIf(this.retryCount, this.operation, errorLike);
        if (shouldRetry) {
            this.scheduleRetry(this.delayFor(this.retryCount, this.operation, errorLike));
            return;
        }
        onContinue();
    };
    scheduleRetry(delay) {
        if (this.timerId) {
            throw new Error(`RetryLink BUG! Encountered overlapping retries`);
        }
        this.timerId = setTimeout(() => {
            this.timerId = undefined;
            this.try();
        }, delay);
    }
}
/**
 * `RetryLink` is a non-terminating link that attempts to retry operations that
 * fail due to network errors. It enables resilient GraphQL operations by
 * automatically retrying failed requests with configurable delay and retry
 * strategies.
 *
 * @remarks
 *
 * `RetryLink` is particularly useful for handling unreliable network conditions
 * where you would rather wait longer than explicitly fail an operation. It
 * provides exponential backoff and jitters delays between attempts by default.
 *
 * > [!NOTE]
 * > This link does not handle retries for GraphQL errors in the response. Use
 * > `ErrorLink` to retry an operation after a GraphQL error. For more
 * > information, see the [Error handling documentation](https://apollographql.com/docs/react/data/error-handling#on-graphql-errors).
 *
 * @example
 *
 * ```ts
 * import { RetryLink } from "@apollo/client/link/retry";
 *
 * const link = new RetryLink();
 * ```
 */
class RetryLink extends link_1.ApolloLink {
    delayFor;
    retryIf;
    constructor(options) {
        super();
        const { attempts, delay } = options || {};
        this.delayFor =
            typeof delay === "function" ? delay : (0, delayFunction_js_1.buildDelayFunction)(delay);
        this.retryIf =
            typeof attempts === "function" ? attempts : (0, retryFunction_js_1.buildRetryFunction)(attempts);
    }
    request(operation, forward) {
        return new rxjs_1.Observable((observer) => {
            const retryable = new RetryableOperation(observer, operation, forward, this.delayFor, this.retryIf);
            return () => {
                retryable.cancel();
            };
        });
    }
}
exports.RetryLink = RetryLink;
//# sourceMappingURL=retryLink.cjs.map
