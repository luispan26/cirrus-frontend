"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getApolloCacheMemoryInternals = exports.getInMemoryCacheMemoryInternals = exports.getApolloClientMemoryInternals = void 0;
exports.registerGlobalCache = registerGlobalCache;
const environment_1 = require("@apollo/client/utilities/environment");
const sizes_js_1 = require("../caching/sizes.cjs");
const globalCaches = {};
function registerGlobalCache(name, getSize) {
    globalCaches[name] = getSize;
}
/**
* For internal purposes only - please call `ApolloClient.getMemoryInternals` instead
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
exports.getApolloClientMemoryInternals = environment_1.__DEV__ ?
    _getApolloClientMemoryInternals
    : undefined;
/**
* For internal purposes only - please call `ApolloClient.getMemoryInternals` instead
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
exports.getInMemoryCacheMemoryInternals = environment_1.__DEV__ ?
    _getInMemoryCacheMemoryInternals
    : undefined;
/**
* For internal purposes only - please call `ApolloClient.getMemoryInternals` instead
* @internal
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
exports.getApolloCacheMemoryInternals = environment_1.__DEV__ ?
    _getApolloCacheMemoryInternals
    : undefined;
function getCurrentCacheSizes() {
    // `defaultCacheSizes` is a `const enum` that will be inlined during build, so we have to reconstruct it's shape here
    const defaults = {
        canonicalStringify: 1000 /* defaultCacheSizes["canonicalStringify"] */,
        checkDocument: 2000 /* defaultCacheSizes["checkDocument"] */,
        print: 2000 /* defaultCacheSizes["print"] */,
        "documentTransform.cache": 2000 /* defaultCacheSizes["documentTransform.cache"] */,
        "queryManager.getDocumentInfo": 2000 /* defaultCacheSizes["queryManager.getDocumentInfo"] */,
        "PersistedQueryLink.persistedQueryHashes": 2000 /* defaultCacheSizes["PersistedQueryLink.persistedQueryHashes"] */,
        "fragmentRegistry.transform": 2000 /* defaultCacheSizes["fragmentRegistry.transform"] */,
        "fragmentRegistry.lookup": 1000 /* defaultCacheSizes["fragmentRegistry.lookup"] */,
        "fragmentRegistry.findFragmentSpreads": 4000 /* defaultCacheSizes["fragmentRegistry.findFragmentSpreads"] */,
        "cache.fragmentQueryDocuments": 1000 /* defaultCacheSizes["cache.fragmentQueryDocuments"] */,
        "removeTypenameFromVariables.getVariableDefinitions": 2000 /* defaultCacheSizes["removeTypenameFromVariables.getVariableDefinitions"] */,
        "inMemoryCache.maybeBroadcastWatch": 5000 /* defaultCacheSizes["inMemoryCache.maybeBroadcastWatch"] */,
        "inMemoryCache.executeSelectionSet": 50000 /* defaultCacheSizes["inMemoryCache.executeSelectionSet"] */,
        "inMemoryCache.executeSubSelectedArray": 10000 /* defaultCacheSizes["inMemoryCache.executeSubSelectedArray"] */,
    };
    return Object.fromEntries(Object.entries(defaults).map(([k, v]) => [
        k,
        sizes_js_1.cacheSizes[k] || v,
    ]));
}
function _getApolloClientMemoryInternals() {
    if (!environment_1.__DEV__)
        throw new Error("only supported in development mode");
    return {
        limits: getCurrentCacheSizes(),
        sizes: {
            print: globalCaches.print?.(),
            canonicalStringify: globalCaches.canonicalStringify?.(),
            links: linkInfo(this.link),
            queryManager: {
                getDocumentInfo: this["queryManager"]["transformCache"].size,
                documentTransforms: transformInfo(this["queryManager"].documentTransform),
            },
            ...this.cache.getMemoryInternals?.(),
        },
    };
}
function _getApolloCacheMemoryInternals() {
    return {
        cache: {
            fragmentQueryDocuments: getWrapperInformation(this["getFragmentDoc"]),
        },
    };
}
function _getInMemoryCacheMemoryInternals() {
    const fragments = this.config.fragments;
    return {
        ..._getApolloCacheMemoryInternals.apply(this),
        addTypenameDocumentTransform: transformInfo(this["addTypenameTransform"]),
        inMemoryCache: {
            executeSelectionSet: getWrapperInformation(this["storeReader"]["executeSelectionSet"]),
            executeSubSelectedArray: getWrapperInformation(this["storeReader"]["executeSubSelectedArray"]),
            maybeBroadcastWatch: getWrapperInformation(this["maybeBroadcastWatch"]),
        },
        fragmentRegistry: {
            findFragmentSpreads: getWrapperInformation(fragments?.findFragmentSpreads),
            lookup: getWrapperInformation(fragments?.lookup),
            transform: getWrapperInformation(fragments?.transform),
        },
    };
}
function isWrapper(f) {
    return !!f && "dirtyKey" in f;
}
function getWrapperInformation(f) {
    return isWrapper(f) ? f.size : undefined;
}
function isDefined(value) {
    return value != null;
}
function transformInfo(transform) {
    return recurseTransformInfo(transform).map((cache) => ({ cache }));
}
function recurseTransformInfo(transform) {
    return transform ?
        [
            getWrapperInformation(transform?.["performWork"]),
            ...recurseTransformInfo(transform?.["left"]),
            ...recurseTransformInfo(transform?.["right"]),
        ].filter(isDefined)
        : [];
}
function linkInfo(link) {
    return link ?
        [
            link?.getMemoryInternals?.(),
            ...linkInfo(link?.left),
            ...linkInfo(link?.right),
        ].filter(isDefined)
        : [];
}
//# sourceMappingURL=getMemoryInternals.cjs.map
