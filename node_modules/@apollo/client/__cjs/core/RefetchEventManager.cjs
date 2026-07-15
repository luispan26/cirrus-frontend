"use strict";;
const {
    __DEV__
} = require("@apollo/client/utilities/environment");

Object.defineProperty(exports, "__esModule", { value: true });
exports.RefetchEventManager = void 0;
const environment_1 = require("@apollo/client/utilities/environment");
const invariant_1 = require("@apollo/client/utilities/invariant");
const defaultHandler = ({ client, matchesRefetchOn, }) => {
    return client.refetchQueries({
        include: "active",
        onQueryUpdated: matchesRefetchOn,
    });
};
class RefetchEventManager {
    sources;
    handlers;
    subscriptions = new Map();
    client;
    defaultHandler;
    constructor(options = {}) {
        this.sources = options.sources ?? {};
        this.handlers = options.handlers ?? {};
        this.defaultHandler = options.defaultHandler ?? defaultHandler;
    }
    /**
     * Connects the client to this refetch event manager. Connecting a client
     * calls each configured source function so they can begin listening for events.
     */
    connect(client) {
        if (this.client === client) {
            return;
        }
        if (this.client) {
            if (environment_1.__DEV__) {
                __DEV__ && invariant_1.invariant.warn(101);
            }
            this.disconnect();
        }
        this.client = client;
        Object.entries(this.sources).forEach(([event, source]) => {
            if (typeof source === "function") {
                this.subscribeToSource(event, source);
            }
        });
    }
    /**
     * Disconnects the client from this refetch event manager and calls the cleanup
     * function for each event source.
     */
    disconnect(client) {
        if (client && this.client !== client) {
            return;
        }
        this.client = undefined;
        this.subscriptions.forEach((subscription) => subscription.unsubscribe());
        this.subscriptions.clear();
    }
    /**
     * Returns whether a source is configured.
     */
    hasSource(source) {
        return Object.hasOwn(this.sources, source);
    }
    /**
     * Replaces the source for an event. If a source was previously configured
     * for the event, its cleanup function is called before the new source is
     * registered.
     */
    setEventSource(name, source) {
        this.sources[name] = source;
        this.subscribeToSource(name, source);
    }
    /**
     * Removes the configured source for an event and runs its cleanup function.
     */
    removeEventSource(event) {
        this.subscriptions.get(event)?.unsubscribe();
        this.subscriptions.delete(event);
        delete this.sources[event];
    }
    /**
     * Replaces the handler for an event.
     */
    setEventHandler(source, handler) {
        this.handlers[source] = handler;
    }
    /**
     * Replaces the default event handler with the provided handler.
     */
    setDefaultEventHandler(handler) {
        this.defaultHandler = handler;
    }
    /**
     * Manually triggers a refetch for the provided event.
     *
     * @remarks
     * This method warns and does not refetch if the refetch event manager is not
     * connected to a client or a source is not configured for the event.
     */
    emit(source, ...args) {
        const [payload] = args;
        if (!this.client) {
            if (environment_1.__DEV__) {
                __DEV__ && invariant_1.invariant.warn(102, source);
            }
            return;
        }
        if (!this.hasSource(source)) {
            if (environment_1.__DEV__) {
                __DEV__ && invariant_1.invariant.warn(103, source);
            }
            return;
        }
        const handler = this.handlers[source] ?? this.defaultHandler;
        function matchesRefetchOn(oq) {
            const ctx = { source, payload };
            const refetchOn = oq.options.refetchOn;
            if (typeof refetchOn === "boolean") {
                return refetchOn;
            }
            if (typeof refetchOn === "function") {
                return refetchOn(ctx);
            }
            if (typeof refetchOn?.[source] === "function") {
                return refetchOn[source](ctx);
            }
            return refetchOn?.[source] !== false;
        }
        handler({ client: this.client, source, payload, matchesRefetchOn });
    }
    subscribeToSource(name, source) {
        this.subscriptions.get(name)?.unsubscribe();
        this.subscriptions.delete(name);
        if (this.client) {
            this.subscriptions.set(name, source().subscribe((value) => this.emit(name, value)));
        }
    }
}
exports.RefetchEventManager = RefetchEventManager;
//# sourceMappingURL=RefetchEventManager.cjs.map
