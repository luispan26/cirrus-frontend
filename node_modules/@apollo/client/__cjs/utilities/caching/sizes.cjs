"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheSizes = void 0;
const globals_1 = require("@apollo/client/utilities/internal/globals");
const cacheSizeSymbol = Symbol.for("apollo.cacheSize");
/**
 * The global cache size configuration for Apollo Client.
 *
 * @remarks
 *
 * You can directly modify this object, but any modification will
 * only have an effect on caches that are created after the modification.
 *
 * So for global caches, such as `canonicalStringify` and `print`,
 * you might need to call `.reset` on them, which will essentially re-create them.
 *
 * Alternatively, you can set `globalThis[Symbol.for("apollo.cacheSize")]` before
 * you load the Apollo Client package:
 *
 * @example
 *
 * ```ts
 * globalThis[Symbol.for("apollo.cacheSize")] = {
 *   print: 100,
 * } satisfies Partial<CacheSizes>; // the `satisfies` is optional if using TypeScript
 * ```
 */
exports.cacheSizes = { ...globals_1.global[cacheSizeSymbol] };
//# sourceMappingURL=sizes.cjs.map
