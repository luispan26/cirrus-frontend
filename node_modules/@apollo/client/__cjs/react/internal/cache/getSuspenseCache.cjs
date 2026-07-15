"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSuspenseCache = getSuspenseCache;
const SuspenseCache_js_1 = require("./SuspenseCache.cjs");
const suspenseCacheSymbol = Symbol.for("apollo.suspenseCache");
function getSuspenseCache(client) {
    if (!client[suspenseCacheSymbol]) {
        client[suspenseCacheSymbol] = new SuspenseCache_js_1.SuspenseCache(client.defaultOptions.react?.suspense);
    }
    return client[suspenseCacheSymbol];
}
//# sourceMappingURL=getSuspenseCache.cjs.map
