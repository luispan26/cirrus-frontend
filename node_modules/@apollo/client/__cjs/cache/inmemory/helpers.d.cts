import type { DocumentNode, SelectionSetNode } from "graphql";
import type { Reference, StoreObject, StoreValue } from "@apollo/client/utilities";
import type { FragmentMap, FragmentMapFunction } from "@apollo/client/utilities/internal";
import { DeepMerger } from "@apollo/client/utilities/internal";
import type { FragmentRegistryAPI } from "./fragmentRegistry.cjs";
import type { KeyFieldsContext } from "./policies.cjs";
import type { InMemoryCacheConfig, NormalizedCache } from "./types.cjs";
export declare const hasOwn: (v: PropertyKey) => boolean;
export declare function defaultDataIdFromObject({ __typename, id, _id }: Readonly<StoreObject>, context?: KeyFieldsContext): string | undefined;
export declare function normalizeConfig(config: InMemoryCacheConfig): InMemoryCacheConfig;
export declare function getTypenameFromStoreObject(store: NormalizedCache, objectOrReference: StoreObject | Reference): string | undefined;
export declare const TypeOrFieldNameRegExp: RegExp;
export declare function fieldNameFromStoreName(storeFieldName: string): string;
export declare function selectionSetMatchesResult(selectionSet: SelectionSetNode, result: Record<string, any>, variables?: Record<string, any>): boolean;
export declare function storeValueIsStoreObject(value: StoreValue): value is StoreObject;
export declare function makeProcessedFieldsMerger(): DeepMerger;
export declare function extractFragmentContext(document: DocumentNode, fragments?: FragmentRegistryAPI): {
    fragmentMap: FragmentMap;
    lookupFragment: FragmentMapFunction;
};
//# sourceMappingURL=helpers.d.cts.map
