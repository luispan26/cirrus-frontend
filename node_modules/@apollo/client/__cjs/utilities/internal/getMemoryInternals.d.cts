declare const globalCaches: {
    print?: () => number;
    canonicalStringify?: () => number;
};
export declare function registerGlobalCache(name: keyof typeof globalCaches, getSize: () => number): void;
/**
* For internal purposes only - please call `ApolloClient.getMemoryInternals` instead
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
export declare const getApolloClientMemoryInternals: (() => {
    limits: {
        [k: string]: number;
    };
    sizes: {
        cache?: {
            fragmentQueryDocuments: number | undefined;
        } | undefined;
        addTypenameDocumentTransform?: {
            cache: number;
        }[] | undefined;
        inMemoryCache?: {
            executeSelectionSet: number | undefined;
            executeSubSelectedArray: number | undefined;
            maybeBroadcastWatch: number | undefined;
        } | undefined;
        fragmentRegistry?: {
            findFragmentSpreads: number | undefined;
            lookup: number | undefined;
            transform: number | undefined;
        } | undefined;
        print: number | undefined;
        canonicalStringify: number | undefined;
        links: unknown[];
        queryManager: {
            getDocumentInfo: number;
            documentTransforms: {
                cache: number;
            }[];
        };
    };
}) | undefined;
/**
* For internal purposes only - please call `ApolloClient.getMemoryInternals` instead
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
export declare const getInMemoryCacheMemoryInternals: (() => {
    addTypenameDocumentTransform: {
        cache: number;
    }[];
    inMemoryCache: {
        executeSelectionSet: number | undefined;
        executeSubSelectedArray: number | undefined;
        maybeBroadcastWatch: number | undefined;
    };
    fragmentRegistry: {
        findFragmentSpreads: number | undefined;
        lookup: number | undefined;
        transform: number | undefined;
    };
    cache: {
        fragmentQueryDocuments: number | undefined;
    };
}) | undefined;
/**
* For internal purposes only - please call `ApolloClient.getMemoryInternals` instead
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
export declare const getApolloCacheMemoryInternals: (() => {
    cache: {
        fragmentQueryDocuments: number | undefined;
    };
}) | undefined;
export {};
//# sourceMappingURL=getMemoryInternals.d.cts.map
