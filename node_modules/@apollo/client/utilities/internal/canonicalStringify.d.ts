/**
 * Serializes a value to JSON with object keys in a consistent, sorted order.
 *
 * @remarks
 *
 * Unlike `JSON.stringify()`, this function ensures that object keys are always
 * serialized in the same alphabetical order, regardless of their original order.
 * This makes it suitable for creating consistent cache keys from objects,
 * comparing objects by their serialized representation, or generating
 * deterministic hashes of objects.
 *
 * To achieve performant sorting, this function uses a `Map` from JSON-serialized
 * arrays of keys (in any order) to sorted arrays of the same keys, with a
 * single sorted array reference shared by all permutations of the keys.
 *
 * As a drawback, this function will add a little more memory for every object
 * encountered that has different (more, less, a different order of) keys than
 * in the past.
 *
 * In a typical application, this extra memory usage should not play a
 * significant role, as `canonicalStringify` will be called for only a limited
 * number of object shapes, and the cache will not grow beyond a certain point.
 * But in some edge cases, this could be a problem. Use canonicalStringify.reset()
 * as a way to clear the memoization cache.
 *
 * @param value - The value to stringify
 * @returns JSON string with consistently ordered object keys
 *
 * @example
 *
 * ```ts
 * import { canonicalStringify } from "@apollo/client/utilities";
 *
 * const obj1 = { b: 2, a: 1 };
 * const obj2 = { a: 1, b: 2 };
 *
 * console.log(canonicalStringify(obj1)); // '{"a":1,"b":2}'
 * console.log(canonicalStringify(obj2)); // '{"a":1,"b":2}'
 * ```
 */
export declare const canonicalStringify: ((value: any) => string) & {
    reset(): void;
};
//# sourceMappingURL=canonicalStringify.d.ts.map