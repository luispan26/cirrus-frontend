"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoCleanedStrongCache = exports.AutoCleanedWeakCache = void 0;
const caches_1 = require("@wry/caches");
const scheduledCleanup = new WeakSet();
function schedule(cache) {
    if (cache.size <= (cache.max || -1)) {
        return;
    }
    if (!scheduledCleanup.has(cache)) {
        scheduledCleanup.add(cache);
        setTimeout(() => {
            cache.clean();
            scheduledCleanup.delete(cache);
        }, 100);
    }
}
/**
* @internal
* A version of WeakCache that will auto-schedule a cleanup of the cache when
* a new item is added and the cache reached maximum size.
* Throttled to once per 100ms.
*
* @privateRemarks
* Should be used throughout the rest of the codebase instead of WeakCache,
* with the notable exception of usage in `wrap` from `optimism` - that one
* already handles cleanup and should remain a `WeakCache`.
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
exports.AutoCleanedWeakCache = function (max, dispose) {
    /*
    Some builds of `WeakCache` are function prototypes, some are classes.
    This library still builds with an ES5 target, so we can't extend the
    real classes.
    Instead, we have to use this workaround until we switch to a newer build
    target.
    */
    const cache = new caches_1.WeakCache(max, dispose);
    cache.set = function (key, value) {
        const ret = caches_1.WeakCache.prototype.set.call(this, key, value);
        schedule(this);
        return ret;
    };
    return cache;
};
/**
* @internal
* A version of StrongCache that will auto-schedule a cleanup of the cache when
* a new item is added and the cache reached maximum size.
* Throttled to once per 100ms.
*
* @privateRemarks
* Should be used throughout the rest of the codebase instead of StrongCache,
* with the notable exception of usage in `wrap` from `optimism` - that one
* already handles cleanup and should remain a `StrongCache`.
* 
* @deprecated This is an internal API and should not be used directly. This can be removed or changed at any time.
*/
exports.AutoCleanedStrongCache = function (max, dispose) {
    /*
    Some builds of `StrongCache` are function prototypes, some are classes.
    This library still builds with an ES5 target, so we can't extend the
    real classes.
    Instead, we have to use this workaround until we switch to a newer build
    target.
    */
    const cache = new caches_1.StrongCache(max, dispose);
    cache.set = function (key, value) {
        const ret = caches_1.StrongCache.prototype.set.call(this, key, value);
        schedule(this);
        return ret;
    };
    return cache;
};
//# sourceMappingURL=caches.cjs.map
