import { map, shareReplay } from "rxjs";
import { memoize } from "./memoize.js";
function mapObservableFragment(observable, mapFn) {
    let currentResult;
    let stableMappedResult;
    function toMapped(result) {
        if (result !== currentResult) {
            currentResult = result;
            stableMappedResult = mapFn(currentResult);
        }
        return stableMappedResult;
    }
    return Object.assign(observable.pipe(map(toMapped), shareReplay({ bufferSize: 1, refCount: true })), {
        getCurrentResult: () => toMapped(observable.getCurrentResult()),
    });
}
export const mapObservableFragmentMemoized = memoize(function mapObservableFragmentMemoized(observable, 
/**
 * used together with `observable` as memoization key, `mapFn` is explicitly not used as memoization key
 */
_cacheKey, mapFn) {
    return mapObservableFragment(observable, mapFn);
}, { max: 1, makeCacheKey: (args) => args.slice(0, 2) });
//# sourceMappingURL=mapObservableFragment.js.map