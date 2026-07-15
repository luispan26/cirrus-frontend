import type { ApolloCache } from "@apollo/client";
export interface ReactiveVar<T> {
    (newValue?: T): T;
    onNextChange(listener: ReactiveListener<T>): () => void;
    attachCache(cache: ApolloCache): this;
    forgetCache(cache: ApolloCache): boolean;
}
type ReactiveListener<T> = (value: T) => any;
export declare const cacheSlot: {
    readonly id: string;
    hasValue(): boolean;
    getValue(): ApolloCache | undefined;
    withValue<TResult, TArgs extends any[], TThis = any>(value: ApolloCache, callback: (this: TThis, ...args: TArgs) => TResult, args?: TArgs | undefined, thisArg?: TThis | undefined): TResult;
};
export declare function forgetCache(cache: ApolloCache): void;
export declare function recallCache(cache: ApolloCache): void;
export declare function makeVar<T>(value: T): ReactiveVar<T>;
export {};
//# sourceMappingURL=reactiveVars.d.ts.map