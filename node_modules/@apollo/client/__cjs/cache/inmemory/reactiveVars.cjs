"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheSlot = void 0;
exports.forgetCache = forgetCache;
exports.recallCache = recallCache;
exports.makeVar = makeVar;
const optimism_1 = require("optimism");
// Contextual Slot that acquires its value when custom read functions are
// called in Policies#readField.
exports.cacheSlot = new optimism_1.Slot();
const cacheInfoMap = new WeakMap();
function getCacheInfo(cache) {
    let info = cacheInfoMap.get(cache);
    if (!info) {
        cacheInfoMap.set(cache, (info = {
            vars: new Set(),
            dep: (0, optimism_1.dep)(),
        }));
    }
    return info;
}
function forgetCache(cache) {
    getCacheInfo(cache).vars.forEach((rv) => rv.forgetCache(cache));
}
// Calling forgetCache(cache) serves to silence broadcasts and allows the
// cache to be garbage collected. However, the varsByCache WeakMap
// preserves the set of reactive variables that were previously associated
// with this cache, which makes it possible to "recall" the cache at a
// later time, by reattaching it to those variables. If the cache has been
// garbage collected in the meantime, because it is no longer reachable,
// you won't be able to call recallCache(cache), and the cache will
// automatically disappear from the varsByCache WeakMap.
function recallCache(cache) {
    getCacheInfo(cache).vars.forEach((rv) => rv.attachCache(cache));
}
function makeVar(value) {
    const caches = new Set();
    const listeners = new Set();
    const rv = function (newValue) {
        if (arguments.length > 0) {
            if (value !== newValue) {
                value = newValue;
                caches.forEach((cache) => {
                    // Invalidate any fields with custom read functions that
                    // consumed this variable, so query results involving those
                    // fields will be recomputed the next time we read them.
                    getCacheInfo(cache).dep.dirty(rv);
                    // Broadcast changes to any caches that have previously read
                    // from this variable.
                    broadcast(cache);
                });
                // Finally, notify any listeners added via rv.onNextChange.
                const oldListeners = Array.from(listeners);
                listeners.clear();
                oldListeners.forEach((listener) => listener(value));
            }
        }
        else {
            // When reading from the variable, obtain the current cache from
            // context via cacheSlot. This isn't entirely foolproof, but it's
            // the same system that powers varDep.
            const cache = exports.cacheSlot.getValue();
            if (cache) {
                attach(cache);
                getCacheInfo(cache).dep(rv);
            }
        }
        return value;
    };
    rv.onNextChange = (listener) => {
        listeners.add(listener);
        return () => {
            listeners.delete(listener);
        };
    };
    const attach = (rv.attachCache = (cache) => {
        caches.add(cache);
        getCacheInfo(cache).vars.add(rv);
        return rv;
    });
    rv.forgetCache = (cache) => caches.delete(cache);
    return rv;
}
function broadcast(cache) {
    if (cache.broadcastWatches) {
        cache.broadcastWatches();
    }
}
//# sourceMappingURL=reactiveVars.cjs.map
