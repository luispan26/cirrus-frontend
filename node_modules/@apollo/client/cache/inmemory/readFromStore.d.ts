import type { SelectionSetNode } from "graphql";
import type { Reference, StoreObject } from "@apollo/client/utilities";
import type { Cache } from "../core/types/Cache.js";
import type { InMemoryCache } from "./inMemoryCache.js";
import type { DiffQueryAgainstStoreOptions, InMemoryCacheConfig, ReadMergeModifyContext } from "./types.js";
interface StoreReaderConfig {
    cache: InMemoryCache;
    fragments?: InMemoryCacheConfig["fragments"];
}
export declare class StoreReader {
    private executeSelectionSet;
    private executeSubSelectedArray;
    private config;
    private knownResults;
    constructor(config: StoreReaderConfig);
    /**
     * Given a store and a query, return as much of the result as possible and
     * identify if any data was missing from the store.
     */
    diffQueryAgainstStore<T>({ store, query, rootId, variables, returnPartialData, }: DiffQueryAgainstStoreOptions): Cache.DiffResult<T>;
    isFresh(result: Record<string, any>, parent: StoreObject | Reference, selectionSet: SelectionSetNode, context: ReadMergeModifyContext): boolean;
    private execSelectionSetImpl;
    private execSubSelectedArrayImpl;
}
export {};
//# sourceMappingURL=readFromStore.d.ts.map