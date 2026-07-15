import type { FieldNode, FragmentDefinitionNode, InlineFragmentNode, SelectionSetNode } from "graphql";
import type { OperationVariables } from "@apollo/client";
import type { Incremental } from "@apollo/client/incremental";
import type { Reference, StoreObject, StoreValue } from "@apollo/client/utilities";
import { isReference } from "@apollo/client/utilities";
import type { FragmentMap } from "@apollo/client/utilities/internal";
import type { CanReadFunction, FieldSpecifier, ReadFieldFunction, ReadFieldOptions, SafeReadonly, ToReferenceFunction } from "../core/types/common.cjs";
import type { InMemoryCache } from "./inMemoryCache.cjs";
import type { IdGetter, MergeInfo, ReadMergeModifyContext } from "./types.cjs";
import type { WriteContext } from "./writeToStore.cjs";
export type TypePolicies = {
    [__typename: string]: TypePolicy;
};
export type KeySpecifier = ReadonlyArray<string | KeySpecifier>;
export type KeyFieldsContext = {
    typename: string | undefined;
    storeObject: StoreObject;
    readField: ReadFieldFunction;
    selectionSet?: SelectionSetNode;
    fragmentMap?: FragmentMap;
    keyObject?: Record<string, any>;
};
export type KeyFieldsFunction = (object: Readonly<StoreObject>, context: KeyFieldsContext) => KeySpecifier | false | ReturnType<IdGetter>;
export type TypePolicy = {
    keyFields?: KeySpecifier | KeyFieldsFunction | false;
    merge?: FieldMergeFunction | boolean;
    queryType?: true;
    mutationType?: true;
    subscriptionType?: true;
    fields?: {
        [fieldName: string]: FieldPolicy<any> | FieldReadFunction<any>;
    };
};
export type KeyArgsFunction = (args: Record<string, any> | null, context: {
    typename: string;
    fieldName: string;
    field: FieldNode | null;
    variables?: Record<string, any>;
}) => KeySpecifier | false | ReturnType<IdGetter>;
export type FieldPolicy<TExisting = any, TIncoming = TExisting, TReadResult = TIncoming, TReadOptions extends FieldReadFunctionOptions = FieldReadFunctionOptions, TMergeOptions extends FieldMergeFunctionOptions = FieldMergeFunctionOptions> = {
    keyArgs?: KeySpecifier | KeyArgsFunction | false;
    read?: FieldReadFunction<TExisting, TReadResult, TReadOptions>;
    merge?: FieldMergeFunction<TExisting, TIncoming, TMergeOptions> | boolean;
};
export type StorageType = Record<string, any>;
export interface FieldFunctionOptions<TArgs = Record<string, any>, TVariables extends OperationVariables = Record<string, any>> {
    args: TArgs | null;
    fieldName: string;
    storeFieldName: string;
    field: FieldNode | null;
    variables?: TVariables;
    isReference: typeof isReference;
    toReference: ToReferenceFunction;
    storage: StorageType;
    cache: InMemoryCache;
    readField: ReadFieldFunction;
    canRead: CanReadFunction;
    mergeObjects: MergeObjectsFunction;
}
export interface FieldReadFunctionOptions<TArgs = Record<string, any>, TVariables extends OperationVariables = Record<string, any>> extends FieldFunctionOptions<TArgs, TVariables> {
}
export interface FieldMergeFunctionOptions<TArgs = Record<string, any>, TVariables extends OperationVariables = Record<string, any>> extends FieldFunctionOptions<TArgs, TVariables> {
    /**
     * Any `extensions` provided when writing the cache.
     */
    extensions: Record<string, unknown> | undefined;
    /**
     * Details about the field when the `@stream` directive is used. Useful with
     * custom merge functions to determine how to merge existing cache data with
     * the incoming stream array.
     *
     * This field is only available in `merge` functions when the `@stream`
     * directive is used on the field.
     *
     * > [!NOTE]
     * > This field is not available when using the `Defer20220824Handler`
     */
    streamFieldInfo?: Incremental.StreamFieldInfo;
    /**
     * The same value as the `existing` argument, but preserves the `existing`
     * value on refetches when `refetchWritePolicy` is `overwrite` (the default).
     */
    existingData: unknown;
}
type MergeObjectsFunction = <T extends StoreObject | Reference>(existing: T, incoming: T) => T;
export type FieldReadFunction<TExisting = any, TReadResult = TExisting, TOptions extends FieldReadFunctionOptions = FieldReadFunctionOptions> = (existing: SafeReadonly<TExisting> | undefined, options: TOptions) => TReadResult | undefined;
export type FieldMergeFunction<TExisting = any, TIncoming = TExisting, TOptions extends FieldMergeFunctionOptions = FieldMergeFunctionOptions> = (existing: SafeReadonly<TExisting> | undefined, incoming: SafeReadonly<TIncoming>, options: TOptions) => SafeReadonly<TExisting>;
export declare const defaultStreamFieldMergeFn: FieldMergeFunction<Array<any>>;
export type PossibleTypesMap = {
    [supertype: string]: string[];
};
export declare class Policies {
    private config;
    private typePolicies;
    private toBeAdded;
    private supertypeMap;
    private fuzzySubtypes;
    readonly cache: InMemoryCache;
    readonly rootIdsByTypename: Record<string, string>;
    readonly rootTypenamesById: Record<string, string>;
    readonly usingPossibleTypes = false;
    constructor(config: {
        cache: InMemoryCache;
        dataIdFromObject?: KeyFieldsFunction;
        possibleTypes?: PossibleTypesMap;
        typePolicies?: TypePolicies;
    });
    identify(object: StoreObject, partialContext?: Partial<KeyFieldsContext>): [string?, StoreObject?];
    addTypePolicies(typePolicies: TypePolicies): void;
    private updateTypePolicy;
    private setRootTypename;
    addPossibleTypes(possibleTypes: PossibleTypesMap): void;
    private getTypePolicy;
    private getFieldPolicy;
    private getSupertypeSet;
    fragmentMatches(fragment: InlineFragmentNode | FragmentDefinitionNode, typename: string | undefined, result?: Record<string, any>, variables?: Record<string, any>): boolean;
    hasKeyArgs(typename: string | undefined, fieldName: string): boolean;
    getStoreFieldName(fieldSpec: FieldSpecifier): string;
    readField<V = StoreValue>(options: ReadFieldOptions, context: ReadMergeModifyContext): SafeReadonly<V> | undefined;
    getReadFunction(typename: string | undefined, fieldName: string): FieldReadFunction | undefined;
    getMergeFunction(parentTypename: string | undefined, fieldName: string, childTypename: string | undefined): FieldMergeFunction | undefined;
    runMergeFunction(existing: StoreValue, incoming: StoreValue, { field, typename, merge, path }: MergeInfo, context: WriteContext, storage?: StorageType): any;
}
export declare function normalizeReadFieldOptions(readFieldArgs: any[], objectOrReference: StoreObject | Reference | undefined, variables?: ReadMergeModifyContext["variables"]): ReadFieldOptions;
export {};
//# sourceMappingURL=policies.d.cts.map
