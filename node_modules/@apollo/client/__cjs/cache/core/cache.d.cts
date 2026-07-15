import type { DocumentNode, FragmentDefinitionNode, InlineFragmentNode } from "graphql";
import { Observable } from "rxjs";
import type { DataValue, GetDataState, OperationVariables, TypedDocumentNode } from "@apollo/client";
import type { FragmentType, Unmasked } from "@apollo/client/masking";
import type { Reference, StoreObject } from "@apollo/client/utilities";
import type { IsAny, NoInfer, Prettify } from "@apollo/client/utilities/internal";
import { getApolloCacheMemoryInternals } from "@apollo/client/utilities/internal";
import type { Cache } from "./types/Cache.cjs";
import type { MissingTree } from "./types/common.cjs";
export type Transaction = (c: ApolloCache) => void;
export declare namespace ApolloCache {
    /**
     * Acceptable values provided to the `from` option.
     */
    type FromOptionValue<TData> = StoreObject | Reference | FragmentType<NoInfer<TData>> | string;
    /**
     * Watched fragment options.
     */
    interface WatchFragmentOptions<TData = unknown, TVariables extends OperationVariables = OperationVariables> {
        /**
         * A GraphQL fragment document parsed into an AST with the `gql`
         * template literal.
         *
         * @docGroup 1. Required options
         */
        fragment: DocumentNode | TypedDocumentNode<TData, TVariables>;
        /**
         * An object containing a `__typename` and primary key fields
         * (such as `id`) identifying the entity object from which the fragment will
         * be retrieved, or a `{ __ref: "..." }` reference, or a `string` ID
         * (uncommon).
         *
         * @docGroup 1. Required options
         */
        from: ApolloCache.FromOptionValue<TData> | Array<ApolloCache.FromOptionValue<TData> | null> | null;
        /**
         * Any variables that the GraphQL fragment may depend on.
         *
         * @docGroup 2. Cache options
         */
        variables?: TVariables;
        /**
         * The name of the fragment defined in the fragment document.
         *
         * Required if the fragment document includes more than one fragment,
         * optional otherwise.
         *
         * @docGroup 2. Cache options
         */
        fragmentName?: string;
        /**
         * If `true`, `watchFragment` returns optimistic results.
         *
         * The default value is `true`.
         *
         * @docGroup 2. Cache options
         */
        optimistic?: boolean;
    }
    /**
     * Watched fragment results.
     */
    type WatchFragmentResult<TData = unknown> = true extends IsAny<TData> ? ({
        complete: true;
        missing?: never;
    } & GetDataState<any, "complete">) | ({
        complete: false;
        missing?: MissingTree;
    } & GetDataState<any, "partial">) : TData extends null | null[] ? Prettify<{
        complete: true;
        missing?: never;
    } & GetDataState<TData, "complete">> : Prettify<{
        complete: true;
        missing?: never;
    } & GetDataState<TData, "complete">> | {
        complete: false;
        missing?: MissingTree;
        /**
        * An object containing the result of your GraphQL query after it completes.
        * 
        * This value might be `undefined` if a query results in one or more errors (depending on the query's `errorPolicy`).
        * 
        * @docGroup 1. Operation data
        */
        data: TData extends Array<infer TItem> ? Array<DataValue.Partial<TItem> | null> : DataValue.Partial<TData>;
        /**
        * Describes the completeness of `data`.
        * 
        * - `empty`: No data could be fulfilled from the cache or the result is
        *   incomplete. `data` is `undefined`.
        * - `partial`: Some data could be fulfilled from the cache but `data` is
        *   incomplete. This is only possible when `returnPartialData` is `true`.
        * - `streaming`: `data` is incomplete as a result of a deferred query and
        *   the result is still streaming in.
        * - `complete`: `data` is a fully satisfied query result fulfilled
        *   either from the cache or network.
        * 
        * @docGroup 1. Operation data
        */
        dataState: "partial";
    };
    interface ObservableFragment<TData = unknown> extends Observable<ApolloCache.WatchFragmentResult<TData>> {
        /**
         * Return the current result for the fragment.
         */
        getCurrentResult: () => ApolloCache.WatchFragmentResult<TData>;
    }
}
export declare abstract class ApolloCache {
    readonly assumeImmutableResults: boolean;
    abstract read<TData = unknown, TVariables extends OperationVariables = OperationVariables>(query: Cache.ReadOptions<TData, TVariables>): Unmasked<TData> | null;
    abstract write<TData = unknown, TVariables extends OperationVariables = OperationVariables>(write: Cache.WriteOptions<TData, TVariables>): Reference | undefined;
    /**
     * Returns data read from the cache for a given query along with information
     * about the cache result such as whether the result is complete and details
     * about missing fields.
     *
     * Will return `complete` as `true` if it can fulfill the full cache result or
     * `false` if not. When no data can be fulfilled from the cache, `null` is
     * returned. When `returnPartialData` is `true`, non-null partial results are
     * returned if it contains at least one field that can be fulfilled from the
     * cache.
     */
    abstract diff<TData = unknown, TVariables extends OperationVariables = OperationVariables>(query: Cache.DiffOptions<TData, TVariables>): Cache.DiffResult<TData>;
    abstract watch<TData = unknown, TVariables extends OperationVariables = OperationVariables>(watch: Cache.WatchOptions<TData, TVariables>): () => void;
    abstract reset(options?: Cache.ResetOptions): Promise<void>;
    abstract evict(options: Cache.EvictOptions): boolean;
    /**
     * Replaces existing state in the cache (if any) with the values expressed by
     * `serializedState`.
     *
     * Called when hydrating a cache (server side rendering, or offline storage),
     * and also (potentially) during hot reloads.
     */
    abstract restore(serializedState: unknown): this;
    /**
     * Exposes the cache's complete state, in a serializable format for later restoration.
     */
    abstract extract(optimistic?: boolean): unknown;
    abstract removeOptimistic(id: string): void;
    abstract fragmentMatches(fragment: InlineFragmentNode | FragmentDefinitionNode, typename: string): boolean;
    lookupFragment(fragmentName: string): FragmentDefinitionNode | null;
    /**
     * Determines whether a `@client` field can be resolved by the cache. Used
     * when `LocalState` does not have a local resolver that can resolve the
     * field.
     *
     * @remarks Cache implementations should return `true` if a mechanism in the
     * cache is expected to provide a value for the field. `LocalState` will set
     * the value of the field to `undefined` in order for the cache to handle it.
     *
     * Cache implementations should return `false` to indicate that it cannot
     * handle resolving the field (either because it doesn't have a mechanism to
     * do so, or because the user hasn't provided enough information to resolve
     * the field). Returning `false` will emit a warning and set the value of the
     * field to `null`.
     *
     * A cache that doesn't implement `resolvesClientField` will be treated the
     * same as returning `false`.
     */
    resolvesClientField?(typename: string, fieldName: string): boolean;
    /**
     * Executes multiple cache operations as a single batch, ensuring that
     * watchers are only notified once after all operations complete. This is
     * useful for improving performance when making multiple cache updates, as it
     * prevents unnecessary re-renders or query refetches between individual
     * operations.
     *
     * The `batch` method supports both optimistic and non-optimistic updates, and
     * provides fine-grained control over which cache layer receives the updates
     * and when watchers are notified.
     *
     * For usage instructions, see [Interacting with cached data: `cache.batch`](https://www.apollographql.com/docs/react/caching/cache-interaction#using-cachebatch).
     *
     * @example
     *
     * ```js
     * cache.batch({
     *   update(cache) {
     *     cache.writeQuery({
     *       query: GET_TODOS,
     *       data: { todos: updatedTodos },
     *     });
     *     cache.evict({ id: "Todo:123" });
     *   },
     * });
     * ```
     *
     * @example
     *
     * ```js
     * // Optimistic update with a custom layer ID
     * cache.batch({
     *   optimistic: "add-todo-optimistic",
     *   update(cache) {
     *     cache.modify({
     *       fields: {
     *         todos(existing = []) {
     *           return [...existing, newTodoRef];
     *         },
     *       },
     *     });
     *   },
     * });
     * ```
     *
     * @returns The return value of the `update` function.
     */
    batch<U>(options: Cache.BatchOptions<this, U>): U;
    abstract performTransaction(transaction: Transaction, optimisticId?: string | null): void;
    recordOptimisticTransaction(transaction: Transaction, optimisticId: string): void;
    transformDocument(document: DocumentNode): DocumentNode;
    transformForLink(document: DocumentNode): DocumentNode;
    identify(object: StoreObject | Reference): string | undefined;
    gc(): string[];
    modify<Entity extends Record<string, any> = Record<string, any>>(options: Cache.ModifyOptions<Entity>): boolean;
    /**
     * Read data from the cache for the specified query.
     */
    readQuery<TData = unknown, TVariables extends OperationVariables = OperationVariables>({ query, variables, id, optimistic, returnPartialData, }: Cache.ReadQueryOptions<TData, TVariables>): Unmasked<TData> | null;
    /**
    * Read data from the cache for the specified query.
    */
    readQuery<TData = unknown, TVariables extends OperationVariables = OperationVariables>(options: Cache.ReadQueryOptions<TData, TVariables>, 
    /**
     * @deprecated Pass the `optimistic` argument as part of the first argument
     * instead of passing it as a separate option.
     */
    optimistic: boolean): Unmasked<TData> | null;
    private fragmentWatches;
    watchFragment<TData = unknown, TVariables extends OperationVariables = OperationVariables>(options: ApolloCache.WatchFragmentOptions<TData, TVariables> & {
        from: Array<ApolloCache.FromOptionValue<TData>>;
    }): ApolloCache.ObservableFragment<Array<Unmasked<TData>>>;
    watchFragment<TData = unknown, TVariables extends OperationVariables = OperationVariables>(options: ApolloCache.WatchFragmentOptions<TData, TVariables> & {
        from: Array<null>;
    }): ApolloCache.ObservableFragment<Array<null>>;
    watchFragment<TData = unknown, TVariables extends OperationVariables = OperationVariables>(options: ApolloCache.WatchFragmentOptions<TData, TVariables> & {
        from: Array<ApolloCache.FromOptionValue<TData> | null>;
    }): ApolloCache.ObservableFragment<Array<Unmasked<TData> | null>>;
    watchFragment<TData = unknown, TVariables extends OperationVariables = OperationVariables>(options: ApolloCache.WatchFragmentOptions<TData, TVariables> & {
        from: null;
    }): ApolloCache.ObservableFragment<null>;
    watchFragment<TData = unknown, TVariables extends OperationVariables = OperationVariables>(options: ApolloCache.WatchFragmentOptions<TData, TVariables> & {
        from: ApolloCache.FromOptionValue<TData>;
    }): ApolloCache.ObservableFragment<Unmasked<TData>>;
    watchFragment<TData = unknown, TVariables extends OperationVariables = OperationVariables>(options: ApolloCache.WatchFragmentOptions<TData, TVariables>): ApolloCache.ObservableFragment<Unmasked<TData> | null>;
    /**
     * Can be overridden by subclasses to delay calling the provided callback
     * until after all broadcasts have been completed - e.g. in a cache scenario
     * where many watchers are notified in parallel.
     */
    protected onAfterBroadcast: (cb: () => void) => void;
    private watchSingleFragment;
    private getFragmentDoc;
    /**
     * Read data from the cache for the specified fragment.
     */
    readFragment<TData = unknown, TVariables extends OperationVariables = OperationVariables>({ fragment, variables, fragmentName, id, from, optimistic, returnPartialData, }: Cache.ReadFragmentOptions<TData, TVariables>): Unmasked<TData> | null;
    readFragment<TData = unknown, TVariables extends OperationVariables = OperationVariables>(options: Cache.ReadFragmentOptions<TData, TVariables>, 
    /**
     * @deprecated Pass the `optimistic` argument as part of the first argument
     * instead of passing it as a separate option.
     */
    optimistic: boolean): Unmasked<TData> | null;
    /**
     * Writes data to the root of the cache using the specified query to validate that
     * the shape of the data you’re writing to the cache is the same as the shape of
     * the data required by the query. Great for prepping the cache with initial data.
     */
    writeQuery<TData = unknown, TVariables extends OperationVariables = OperationVariables>({ data, query, variables, overwrite, id, broadcast, }: Cache.WriteQueryOptions<TData, TVariables>): Reference | undefined;
    /**
     * Similar to `writeQuery` (writes data to the cache) but uses the specified
     * fragment to validate that the shape of the data you’re writing to the cache
     * is the same as the shape of the data required by the fragment.
     */
    writeFragment<TData = unknown, TVariables extends OperationVariables = OperationVariables>({ data, fragment, fragmentName, variables, overwrite, id, from, broadcast, }: Cache.WriteFragmentOptions<TData, TVariables>): Reference | undefined;
    updateQuery<TData = unknown, TVariables extends OperationVariables = OperationVariables>(options: Cache.UpdateQueryOptions<TData, TVariables>, update: (data: Unmasked<TData> | null) => Unmasked<TData> | null | void): Unmasked<TData> | null;
    updateFragment<TData = unknown, TVariables extends OperationVariables = OperationVariables>(options: Cache.UpdateFragmentOptions<TData, TVariables>, update: (data: Unmasked<TData> | null) => Unmasked<TData> | null | void): Unmasked<TData> | null;
    private toCacheId;
    /**
    * @experimental
    * @internal
    * This is not a stable API - it is used in development builds to expose
    * information to the DevTools.
    * Use at your own risk!
    * 
    * @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
    */
    getMemoryInternals?: typeof getApolloCacheMemoryInternals;
}
//# sourceMappingURL=cache.d.cts.map
