import type { Observable } from "@apollo/client/utilities";
import type { ApolloClient } from "./ApolloClient.js";
import type { ObservableQuery } from "./ObservableQuery.js";
import type { RefetchEvents } from "./types.js";
export declare namespace RefetchEventManager {
    interface Options {
        /**
         * A mapping of event names to source functions. The source function is
         * called by the refetch event manager to begin listening for events that
         * trigger automatic refetches. Set to `true` if the event is only
         * triggered by calling `emit` and has no automatic detection logic.
         */
        sources?: {
            [Key in keyof RefetchEvents]?: true | RefetchEventManager.EventSource<RefetchEvents[Key]>;
        };
        /**
         * A mapping of event names to handler functions that run
         * `client.refetchQueries`. Provide a handler for an event to customize
         * which queries are refetched when an event is triggered.
         */
        handlers?: {
            [Key in keyof RefetchEvents]?: RefetchEventManager.EventHandler<Key>;
        };
        /**
         * Override the default handler. Used as a fallback when a refetch
         * handler is not defined for a specific event.
         */
        defaultHandler?: RefetchEventManager.EventHandler<keyof RefetchEvents>;
    }
    type EventSource<T> = () => Observable<T>;
    type EventHandler<TSource extends keyof RefetchEvents = keyof RefetchEvents> = (context: RefetchEventManager.RefetchHandlerContext<TSource>) => ApolloClient.RefetchQueriesResult<any> | void;
    type RefetchHandlerContext<TSource extends keyof RefetchEvents = keyof RefetchEvents> = TSource extends keyof RefetchEvents ? {
        /**
         * The `ApolloClient` instance connected to the refetch event manager.
         */
        client: ApolloClient;
        /**
         * Helper function that evaluates the `refetchOn` option to determine if
         * the query should be refetched based on the event that triggered the
         * refetch.
         *
         * @example
         *
         * ```ts
         * new RefetchEventManager({
         *   handlers: {
         *     customEvent: ({ client, matchesRefetchOn }) => {
         *       return client.refetchQueries({
         *         include: "all",
         *         onQueryUpdated: matchesRefetchOn,
         *       });
         *     },
         *   },
         * });
         * ```
         *
         * @example
         * Combined with custom logic
         *
         * ```ts
         * new RefetchEventManager({
         *   handlers: {
         *     customEvent: ({ client, matchesRefetchOn }) => {
         *       return client.refetchQueries({
         *         include: "active",
         *         onQueryUpdated: (observableQuery) => {
         *           return (
         *             matchesRefetchOn(observableQuery) &&
         *             someOtherCondition(observableQuery)
         *           );
         *         },
         *       });
         *     },
         *   },
         * });
         * ```
         */
        matchesRefetchOn: (observableQuery: ObservableQuery<any>) => boolean;
        /**
         * The source name that triggered the refetch.
         */
        source: TSource;
        /**
         * Any data emitted by the source along with the event
         */
        payload: RefetchEvents[TSource];
    } : never;
}
export declare class RefetchEventManager {
    private sources;
    private handlers;
    private subscriptions;
    private client;
    private defaultHandler;
    constructor(options?: RefetchEventManager.Options);
    /**
     * Connects the client to this refetch event manager. Connecting a client
     * calls each configured source function so they can begin listening for events.
     */
    connect(client: ApolloClient): void;
    /**
     * Disconnects the client from this refetch event manager and calls the cleanup
     * function for each event source.
     */
    disconnect(client?: ApolloClient): void;
    /**
     * Returns whether a source is configured.
     */
    hasSource(source: keyof RefetchEvents): boolean;
    /**
     * Replaces the source for an event. If a source was previously configured
     * for the event, its cleanup function is called before the new source is
     * registered.
     */
    setEventSource<TSource extends keyof RefetchEvents>(name: TSource, source: RefetchEventManager.EventSource<RefetchEvents[TSource]>): void;
    /**
     * Removes the configured source for an event and runs its cleanup function.
     */
    removeEventSource(event: keyof RefetchEvents): void;
    /**
     * Replaces the handler for an event.
     */
    setEventHandler<TSource extends keyof RefetchEvents>(source: TSource, handler: RefetchEventManager.EventHandler<TSource>): void;
    /**
     * Replaces the default event handler with the provided handler.
     */
    setDefaultEventHandler(handler: RefetchEventManager.EventHandler<keyof RefetchEvents>): void;
    /**
     * Manually triggers a refetch for the provided event.
     *
     * @remarks
     * This method warns and does not refetch if the refetch event manager is not
     * connected to a client or a source is not configured for the event.
     */
    emit<TSource extends keyof RefetchEvents>(source: TSource, ...args: RefetchEvents[TSource] extends void | never ? [] : undefined extends RefetchEvents[TSource] ? [
        payload?: RefetchEvents[TSource]
    ] : [payload: RefetchEvents[TSource]]): void;
    private subscribeToSource;
}
//# sourceMappingURL=RefetchEventManager.d.ts.map