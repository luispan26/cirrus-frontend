import type { DocumentNode, FragmentDefinitionNode, InlineFragmentNode } from "graphql";
import type { OperationVariables } from "@apollo/client";
import type { DeepPartial, Reference, StoreObject } from "@apollo/client/utilities";
import { getInMemoryCacheMemoryInternals } from "@apollo/client/utilities/internal";
import { ApolloCache } from "../core/cache.js";
import type { Cache } from "../core/types/Cache.js";
import { Policies } from "./policies.js";
import { makeVar } from "./reactiveVars.js";
import type { InMemoryCacheConfig, NormalizedCacheObject } from "./types.js";
type BroadcastOptions = Pick<Cache.BatchOptions<InMemoryCache>, "optimistic" | "onWatchUpdated">;
export declare class InMemoryCache extends ApolloCache {
    private data;
    private optimisticData;
    protected config: InMemoryCacheConfig;
    private watches;
    private storeReader;
    private storeWriter;
    private addTypenameTransform;
    private maybeBroadcastWatch;
    readonly assumeImmutableResults = true;
    readonly policies: Policies;
    readonly makeVar: typeof makeVar;
    constructor(config?: InMemoryCacheConfig);
    private init;
    private resetResultCache;
    restore(data: NormalizedCacheObject): this;
    extract(optimistic?: boolean): NormalizedCacheObject;
    read<TData = unknown>(options: Cache.ReadOptions<TData, OperationVariables> & {
        returnPartialData: true;
    }): TData | DeepPartial<TData> | null;
    read<TData = unknown>(options: Cache.ReadOptions<TData, OperationVariables>): TData | null;
    write<TData = unknown, TVariables extends OperationVariables = OperationVariables>(options: Cache.WriteOptions<TData, TVariables>): Reference | undefined;
    modify<Entity extends Record<string, any> = Record<string, any>>(options: Cache.ModifyOptions<Entity>): boolean;
    diff<TData = unknown, TVariables extends OperationVariables = OperationVariables>(options: Cache.DiffOptions<TData, TVariables>): Cache.DiffResult<TData>;
    watch<TData = unknown, TVariables extends OperationVariables = OperationVariables>(watch: Cache.WatchOptions<TData, TVariables>): () => void;
    gc(options?: {
        resetResultCache?: boolean;
    }): string[];
    retain(rootId: string, optimistic?: boolean): number;
    release(rootId: string, optimistic?: boolean): number;
    identify(object: StoreObject | Reference): string | undefined;
    evict(options: Cache.EvictOptions): boolean;
    reset(options?: Cache.ResetOptions): Promise<void>;
    removeOptimistic(idToRemove: string): void;
    private txCount;
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
    batch<TUpdateResult>(options: Cache.BatchOptions<InMemoryCache, TUpdateResult>): TUpdateResult;
    performTransaction(update: (cache: InMemoryCache) => any, optimisticId?: string | null): any;
    transformDocument(document: DocumentNode): DocumentNode;
    fragmentMatches(fragment: InlineFragmentNode | FragmentDefinitionNode, typename: string): boolean;
    lookupFragment(fragmentName: string): FragmentDefinitionNode | null;
    resolvesClientField(typename: string, fieldName: string): boolean;
    protected broadcastWatches(options?: BroadcastOptions): void;
    private addFragmentsToDocument;
    private broadcastWatch;
    /**
    * @experimental
    * @internal
    * This is not a stable API - it is used in development builds to expose
    * information to the DevTools.
    * Use at your own risk!
    * 
    * @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
    */
    getMemoryInternals?: typeof getInMemoryCacheMemoryInternals;
}
export {};
//# sourceMappingURL=inMemoryCache.d.ts.map
