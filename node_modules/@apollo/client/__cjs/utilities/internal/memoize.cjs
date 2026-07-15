"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.memoize = memoize;
const trie_1 = require("@wry/trie");
const caches_js_1 = require("./caches.cjs");
/**
 * Naive alternative to `wrap` without any dependency tracking, potentially avoiding resulting memory leaks.
 */
function memoize(fn, { max, makeCacheKey = (args) => args, }) {
    const keys = new trie_1.Trie(true);
    const cache = new caches_js_1.AutoCleanedWeakCache(max);
    return (...args) => {
        const cacheKey = keys.lookupArray(makeCacheKey(args));
        const cached = cache.get(cacheKey);
        if (cached) {
            if (cached.error) {
                throw cached.error;
            }
            return cached.result;
        }
        const entry = cache.set(cacheKey, {});
        try {
            return (entry.result = fn(...args));
        }
        catch (error) {
            entry.error = error;
            throw error;
        }
    };
}
//# sourceMappingURL=memoize.cjs.map
