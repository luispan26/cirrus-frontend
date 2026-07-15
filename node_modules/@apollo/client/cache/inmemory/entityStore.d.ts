import { Trie } from "@wry/trie";
import type { DocumentNode, FieldNode, SelectionSetNode } from "graphql";
import type { Reference, StoreObject, StoreValue } from "@apollo/client/utilities";
import type { Cache } from "../core/types/Cache.js";
import type { CanReadFunction, Modifier, Modifiers, SafeReadonly, ToReferenceFunction } from "../core/types/common.js";
import type { Policies, StorageType } from "./policies.js";
import type { NormalizedCache, NormalizedCacheObject } from "./types.js";
export declare abstract class EntityStore implements NormalizedCache {
    readonly policies: Policies;
    readonly group: CacheGroup;
    static Root: typeof Root;
    protected data: NormalizedCacheObject;
    constructor(policies: Policies, group: CacheGroup);
    abstract addLayer(layerId: string, replay: (layer: EntityStore) => any): Layer;
    abstract removeLayer(layerId: string): EntityStore;
    toObject(): NormalizedCacheObject;
    has(dataId: string): boolean;
    get(dataId: string, fieldName: string): StoreValue;
    protected lookup(dataId: string, dependOnExistence?: boolean): StoreObject | undefined;
    merge(older: string | StoreObject, newer: StoreObject | string): void;
    modify(dataId: string, fields: Modifier<any> | Modifiers<Record<string, any>>, exact: boolean): boolean;
    delete(dataId: string, fieldName?: string, args?: Record<string, any>): boolean;
    evict(options: Cache.EvictOptions, limit: EntityStore): boolean;
    clear(): void;
    extract(): NormalizedCacheObject;
    replace(newData: NormalizedCacheObject | null): void;
    abstract getStorage(idOrObj: string | StoreObject, ...storeFieldNames: (string | number)[]): StorageType;
    private rootIds;
    retain(rootId: string): number;
    release(rootId: string): number;
    getRootIdSet(ids?: Set<string>): Set<string>;
    gc(): string[];
    private refs;
    findChildRefIds(dataId: string): Record<string, true>;
    /** overload for `InMemoryCache.maybeBroadcastWatch` */
    makeCacheKey(document: DocumentNode, callback: Cache.WatchCallback<any>, details: string): object;
    /** overload for `StoreReader.executeSelectionSet` */
    makeCacheKey(selectionSet: SelectionSetNode, parent: string | StoreObject, varString: string | undefined): object;
    /** overload for `StoreReader.executeSubSelectedArray` */
    makeCacheKey(field: FieldNode, array: readonly any[], varString: string | undefined): object;
    /**
     * @deprecated This is only meant for internal usage,
     * in your own code please use a `Trie` instance instead.
     */
    makeCacheKey(...args: any[]): object;
    getFieldValue: <T = StoreValue>(objectOrReference: StoreObject | Reference | undefined, storeFieldName: string) => SafeReadonly<T>;
    canRead: CanReadFunction;
    toReference: ToReferenceFunction;
    get supportsResultCaching(): boolean;
}
export type FieldValueGetter = EntityStore["getFieldValue"];
declare class CacheGroup {
    readonly caching: boolean;
    private parent;
    private d;
    keyMaker: Trie<object>;
    constructor(caching: boolean, parent?: CacheGroup | null);
    resetCaching(): void;
    depend(dataId: string, storeFieldName: string): void;
    dirty(dataId: string, storeFieldName: string): void;
}
export declare function maybeDependOnExistenceOfEntity(store: NormalizedCache, entityId: string): void;
declare class Root extends EntityStore {
    constructor({ policies, resultCaching, seed, }: {
        policies: Policies;
        resultCaching?: boolean;
        seed?: NormalizedCacheObject;
    });
    readonly stump: Stump;
    addLayer(layerId: string, replay: (layer: EntityStore) => any): Layer;
    removeLayer(): Root;
    readonly storageTrie: Trie<StorageType>;
    getStorage(): StorageType;
}
declare class Layer extends EntityStore {
    readonly id: string;
    readonly parent: EntityStore;
    readonly replay: (layer: EntityStore) => any;
    readonly group: CacheGroup;
    constructor(id: string, parent: EntityStore, replay: (layer: EntityStore) => any, group: CacheGroup);
    addLayer(layerId: string, replay: (layer: EntityStore) => any): Layer;
    removeLayer(layerId: string): EntityStore;
    toObject(): NormalizedCacheObject;
    findChildRefIds(dataId: string): Record<string, true>;
    getStorage(...args: Parameters<EntityStore["getStorage"]>): StorageType;
}
declare class Stump extends Layer {
    constructor(root: Root);
    removeLayer(): this;
    merge(older: string | StoreObject, newer: string | StoreObject): void;
}
export declare function supportsResultCaching(store: any): store is EntityStore;
export {};
//# sourceMappingURL=entityStore.d.ts.map