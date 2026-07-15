"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockSubscriptionLink = void 0;
const rxjs_1 = require("rxjs");
const link_1 = require("@apollo/client/link");
class MockSubscriptionLink extends link_1.ApolloLink {
    unsubscribers = [];
    setups = [];
    operation;
    observers = [];
    constructor() {
        super();
    }
    request(operation) {
        this.operation = operation;
        return new rxjs_1.Observable((observer) => {
            this.setups.forEach((x) => x());
            this.observers.push(observer);
            return () => {
                this.unsubscribers.forEach((x) => x());
            };
        });
    }
    simulateResult(result, complete = false) {
        setTimeout(() => {
            const { observers } = this;
            if (!observers.length)
                throw new Error("subscription torn down");
            observers.forEach((observer) => {
                if (result.result && observer.next)
                    observer.next(result.result);
                if (result.error && observer.error)
                    observer.error(result.error);
                if (complete && observer.complete)
                    observer.complete();
            });
        }, result.delay || 0);
    }
    simulateComplete() {
        const { observers } = this;
        if (!observers.length)
            throw new Error("subscription torn down");
        observers.forEach((observer) => {
            if (observer.complete)
                observer.complete();
        });
    }
    onSetup(listener) {
        this.setups = this.setups.concat([listener]);
    }
    onUnsubscribe(listener) {
        this.unsubscribers = this.unsubscribers.concat([listener]);
    }
}
exports.MockSubscriptionLink = MockSubscriptionLink;
//# sourceMappingURL=mockSubscriptionLink.cjs.map
