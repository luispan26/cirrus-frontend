/**
 * Naive alternative to `wrap` without any dependency tracking, potentially avoiding resulting memory leaks.
 */
export declare function memoize<TArgs extends any[], TResult>(fn: (...args: TArgs) => TResult, { max, makeCacheKey, }: {
    max: number;
    makeCacheKey?: (args: TArgs) => [...any[]];
}): (...args: TArgs) => TResult;
//# sourceMappingURL=memoize.d.cts.map
