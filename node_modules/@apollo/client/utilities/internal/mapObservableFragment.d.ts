import type { ApolloCache } from "@apollo/client";
export declare const mapObservableFragmentMemoized: <From, To>(observable: ApolloCache.ObservableFragment<From>, _cacheKey: symbol, mapFn: (from: ApolloCache.WatchFragmentResult<From>) => ApolloCache.WatchFragmentResult<To>) => ApolloCache.ObservableFragment<To>;
//# sourceMappingURL=mapObservableFragment.d.ts.map