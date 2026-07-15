import type { OperatorFunction } from "rxjs";
export declare function filterMap<T, R>(fn: (value: T, context: undefined) => R | undefined): OperatorFunction<T, R>;
export declare function filterMap<T, R, Context>(fn: (value: T, context: Context) => R | undefined, makeContext: () => NoInfer<Context>): OperatorFunction<T, R>;
//# sourceMappingURL=filterMap.d.ts.map