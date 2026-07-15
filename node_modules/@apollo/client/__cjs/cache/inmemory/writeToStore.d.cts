import type { FieldNode, SelectionSetNode } from "graphql";
import type { Cache, OperationVariables } from "@apollo/client";
import type { Reference, StoreObject } from "@apollo/client/utilities";
import type { FragmentMap, FragmentMapFunction } from "@apollo/client/utilities/internal";
import type { InMemoryCache } from "./inMemoryCache.cjs";
import type { StoreReader } from "./readFromStore.cjs";
import type { InMemoryCacheConfig, MergeTree, NormalizedCache, ReadMergeModifyContext } from "./types.cjs";
export interface WriteContext extends ReadMergeModifyContext {
    readonly written: {
        [dataId: string]: SelectionSetNode[];
    };
    readonly fragmentMap: FragmentMap;
    lookupFragment: FragmentMapFunction;
    merge<T>(existing: T, incoming: T): T;
    overwrite: boolean;
    incomingById: Map<string, {
        storeObject: StoreObject;
        mergeTree?: MergeTree;
        fieldNodeSet: Set<FieldNode>;
    }>;
    clientOnly: boolean;
    deferred: boolean;
    flavors: Map<string, FlavorableWriteContext>;
}
type FlavorableWriteContext = Pick<WriteContext, "clientOnly" | "deferred" | "flavors">;
export declare class StoreWriter {
    readonly cache: InMemoryCache;
    private reader?;
    private fragments?;
    constructor(cache: InMemoryCache, reader?: StoreReader | undefined, fragments?: InMemoryCacheConfig["fragments"]);
    writeToStore<TData = unknown, TVariables extends OperationVariables = OperationVariables>(store: NormalizedCache, { query, result, dataId, variables, overwrite, extensions, }: Cache.WriteOptions<TData, TVariables>): Reference | undefined;
    private processSelectionSet;
    private processFieldValue;
    private flattenFields;
    private applyMerges;
}
export {};
//# sourceMappingURL=writeToStore.d.cts.map
