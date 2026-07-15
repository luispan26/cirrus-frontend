"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuspenseCache = void 0;
const trie_1 = require("@wry/trie");
const FragmentReference_js_1 = require("./FragmentReference.cjs");
const QueryReference_js_1 = require("./QueryReference.cjs");
class SuspenseCache {
    queryRefs = new trie_1.Trie();
    fragmentRefs = new trie_1.Trie();
    options;
    constructor(options = {}) {
        this.options = options;
    }
    getQueryRef(cacheKey, createObservable) {
        const ref = this.queryRefs.lookupArray(cacheKey);
        if (!ref.current) {
            ref.current = new QueryReference_js_1.InternalQueryReference(createObservable(), {
                autoDisposeTimeoutMs: this.options.autoDisposeTimeoutMs,
                onDispose: () => {
                    delete ref.current;
                },
            });
        }
        return ref.current;
    }
    getFragmentRef(cacheKey, client, options) {
        const ref = this.fragmentRefs.lookupArray(cacheKey);
        if (!ref.current) {
            ref.current = new FragmentReference_js_1.FragmentReference(client, options, {
                autoDisposeTimeoutMs: this.options.autoDisposeTimeoutMs,
                onDispose: () => {
                    delete ref.current;
                },
            });
        }
        return ref.current;
    }
    add(cacheKey, queryRef) {
        const ref = this.queryRefs.lookupArray(cacheKey);
        ref.current = queryRef;
    }
}
exports.SuspenseCache = SuspenseCache;
//# sourceMappingURL=SuspenseCache.cjs.map
