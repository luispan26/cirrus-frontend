import { Trie } from "@wry/trie";
import { AutoCleanedWeakCache } from "./caches.js";
/**
 * Naive alternative to `wrap` without any dependency tracking, potentially avoiding resulting memory leaks.
 */
export function memoize(fn, { max, makeCacheKey = (args) => args, }) {
    const keys = new Trie(true);
    const cache = new AutoCleanedWeakCache(max);
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
//# sourceMappingURL=memoize.js.map