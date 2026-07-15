import { Observable } from "rxjs";
import { ApolloLink } from "@apollo/client/link";
export class MockSubscriptionLink extends ApolloLink {
    unsubscribers = [];
    setups = [];
    operation;
    observers = [];
    constructor() {
        super();
    }
    request(operation) {
        this.operation = operation;
        return new Observable((observer) => {
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
//# sourceMappingURL=mockSubscriptionLink.js.map